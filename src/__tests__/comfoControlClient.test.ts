import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { ComfoControlClient } from '../comfoControlClient';
import { ComfoControlTransport } from '../comfoControlTransport';
import { Opcode, Result } from '../protocol/comfoConnect';
import { Logger } from '../util/logging/index';
import { DeviceProperty } from '../deviceProperties';
import { ComfoControlMessage } from '../comfoControlMessage';

vi.mock('../comfoControlTransport', () => {
    const transportMock = new EventEmitter() as any;
    transportMock.isConnected = false;
    transportMock.isConnecting = false;
    transportMock.id = 0;
    transportMock.messages = [];
    transportMock.connect = vi.fn(async function () {
        this.isConnected = true;
        this.emit('connect');
    });
    transportMock.send = vi.fn(async function () {
        process.nextTick(() => {
            this.emit('message', this.messages.shift());
        });
        return ++this.id;
    });
    transportMock.disconnect = vi.fn(function () {
        this.isConnected = false;
    });
    return { ComfoControlTransport: vi.fn(() => transportMock) };
});

describe('ComfoControlClient', () => {
    let client: ComfoControlClient;
    let mockTransport: any;
    let logger: Logger;

    beforeEach(() => {
        mockTransport = new (ComfoControlTransport as any)();
        mockTransport.isConnected = false;
        mockTransport.isConnecting = false;
        mockTransport.id = 0;
        mockTransport.messages = [];
        logger = new Logger('TestLogger');
        client = new ComfoControlClient(
            {
                address: '127.0.0.1',
                uuid: '0123456789abcdef0123456789abcdef',
                clientUuid: 'fedcba9876543210fedcba9876543210',
            },
            logger,
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should start a session successfully', async () => {
        mockTransport.messages = [
            ComfoControlMessage.fromJson({ opcode: Opcode.REGISTER_DEVICE_CONFIRM, id: 1, result: Result.OK }),
            ComfoControlMessage.fromJson({ opcode: Opcode.START_SESSION_CONFIRM, id: 2, result: Result.OK }),
        ];

        await client.startSession();

        expect(mockTransport.send).toHaveBeenCalledWith(Opcode.REGISTER_DEVICE_REQUEST, expect.any(Object));
        expect(mockTransport.send).toHaveBeenCalledWith(Opcode.START_SESSION_REQUEST, { takeover: true });
        expect(client.sessionActive).toBe(true);
    });

    it('should send a request and receive a response', async () => {
        mockTransport.messages = [
            ComfoControlMessage.fromJson({ opcode: Opcode.REGISTER_DEVICE_CONFIRM, id: 1, result: Result.OK }),
            ComfoControlMessage.fromJson({ opcode: Opcode.START_SESSION_CONFIRM, id: 2, result: Result.OK }),
            ComfoControlMessage.fromJson(
                { opcode: Opcode.CN_TIME_CONFIRM, id: 3, result: Result.OK },
                { currentTime: 1234567890 },
            ),
        ];

        const response = await client.send(Opcode.CN_TIME_REQUEST);

        expect(mockTransport.send).toHaveBeenCalledWith(Opcode.CN_TIME_REQUEST, expect.any(Object));
        expect(response.opcode).toBe(Opcode.CN_TIME_CONFIRM);
    });

    it('should get server time', async () => {
        const baseTime = new Date(2000, 1, 1).getTime();
        const currentTime = Date.now();
        mockTransport.messages = [
            ComfoControlMessage.fromJson({ opcode: Opcode.REGISTER_DEVICE_CONFIRM, id: 1, result: Result.OK }),
            ComfoControlMessage.fromJson({ opcode: Opcode.START_SESSION_CONFIRM, id: 2, result: Result.OK }),
            ComfoControlMessage.fromJson(
                { opcode: Opcode.CN_TIME_CONFIRM, id: 3, result: Result.OK },
                { currentTime: Math.floor((Date.now() - baseTime) / 1000) },
            ),
        ];

        const serverTime = await client.getServerTime();

        expect(mockTransport.send).toHaveBeenCalledWith(Opcode.CN_TIME_REQUEST, expect.any(Object));
        expect(serverTime.getTime()).toBeCloseTo(Math.floor(currentTime / 1000) * 1000, -2);
    });

    it('should register a property listener', async () => {
        mockTransport.messages = [
            ComfoControlMessage.fromJson({ opcode: Opcode.REGISTER_DEVICE_CONFIRM, id: 1, result: Result.OK }),
            ComfoControlMessage.fromJson({ opcode: Opcode.START_SESSION_CONFIRM, id: 2, result: Result.OK }),
            ComfoControlMessage.fromJson({ opcode: Opcode.CN_RPDO_CONFIRM, id: 3, result: Result.OK }),
        ];

        const property: DeviceProperty = { propertyId: 1, dataType: 0 };
        const listener = vi.fn();

        await client.registerPropertyListener(property, listener);

        expect(mockTransport.send).toHaveBeenCalledWith(Opcode.CN_RPDO_REQUEST, expect.any(Object));
        expect(client['propertyListeners'][property.propertyId]).toContain(listener);
    });
});
