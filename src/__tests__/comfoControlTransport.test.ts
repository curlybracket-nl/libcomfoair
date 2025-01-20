import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { EventEmitter } from 'node:events';
import { ComfoControlTransport } from '../comfoControlTransport';
import { Opcode, StartSessionRequest, StartSessionConfirm, GatewayOperation } from '../protocol/comfoConnect';
import { Socket } from 'node:net';
import { ComfoControlHeader } from '../comfoControlHeader';
import { ComfoControlMessage } from '../comfoControlMessage';

vi.mock('node:net', () => {
    const socketMock = new EventEmitter() as Socket;
    socketMock.connect = vi.fn();
    socketMock.write = vi.fn();
    socketMock.end = vi.fn();
    socketMock.destroy = vi.fn();
    return { Socket: vi.fn(() => socketMock) };
});

describe('ComfoControlTransport', () => {
    let transport: ComfoControlTransport;
    let mockSocket: any;

    beforeEach(() => {
        mockSocket = (Socket as any)();
        mockSocket.removeAllListeners();
        mockSocket.connect.mockImplementation((port: number, address: string, cb: any) => {
            process.nextTick(() => {
                mockSocket.emit('connect');
                cb?.();
            });
        });

        transport = new ComfoControlTransport({
            address: '127.0.0.1',
            port: 5678,
            uuid: '0123456789abcdef0123456789abcdef',
            clientUuid: 'fedcba9876543210fedcba9876543210',
        });
    });

    afterEach(() => {        
        vi.restoreAllMocks();
    });

    it('should connect successfully', async () => {
        await transport.connect();
        expect(mockSocket.connect).toHaveBeenCalledWith(5678, '127.0.0.1');
        expect(transport.isConnected).toBe(true);
    });

    it('should fail to connect if socket errors', async () => {
        mockSocket.connect.mockImplementation((port: number, address: string, cb: any) => {
            process.nextTick(() => {
                mockSocket.emit('error', new Error('mock connection error'));
                cb?.(new Error('mock connection error'));
            });
        });
        await expect(transport.connect()).rejects.toThrow('mock connection error');
        expect(transport.isConnected).toBe(false);
    });

    it('should write data to socker when calling send', async () => {
        await transport.connect();
        mockSocket.write.mockImplementation((_buffer: Buffer, cb: any) => cb?.());
        const refId = await transport.send(Opcode.START_SESSION_REQUEST, { takeover: true });
        
        expect(refId).toBe(1);
        expect(mockSocket.write).toHaveBeenCalled();

        // Check data written to the socket
        const message = mockSocket.write.mock.calls[0][0].toString('hex');
        const expected = [
            '00000028', // Total length
            'fedcba9876543210fedcba9876543210', // Target UUID
            '0123456789abcdef0123456789abcdef', // Sender UUID
            '00040803', // Operation payload -- contains opcode and id
            '20010801', // Message payload -- contains message data: takeover=true
        ].join('');

        expect(message).toBe(expected);
    });

    it('should handle receiving a data', async () => {
        await transport.connect();
        const msgAwaiter = new Promise<ComfoControlMessage>((resolve) => {
            transport.on('message', (msg) => resolve(msg))
        });

        // Simulate incoming data
        const message = StartSessionConfirm.toBinary({ deviceName: '', resumed: false });
        const operation = GatewayOperation.toBinary({ opcode: Opcode.START_SESSION_CONFIRM, id: 1 });
        const header = new ComfoControlHeader('0', '0', operation.length, message.length);
        mockSocket.emit('data', Buffer.concat([header.toBinary(), operation, message]));
        
        // check msg
        const msg = await msgAwaiter;        
        expect(msg.opcode).toBe(Opcode.START_SESSION_CONFIRM);
        const result = msg.deserialize<Opcode.START_SESSION_CONFIRM>();
        expect(result.resumed).toBe(false);
    });

    it('should throw error on send if not connected', async () => {
        await expect(async () => transport.send(Opcode.START_SESSION_REQUEST, {})).rejects.toThrow('Cannot send data on a disconnected socket');
    });
});