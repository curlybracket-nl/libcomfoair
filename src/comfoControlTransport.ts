import { Socket } from 'node:net';
import { EventEmitter } from 'node:events';
import { Logger } from './util/logging/index.js';
import { ComfoControlMessage } from './comfoControlMessage.js';
import { Opcode, GatewayOperation } from './protocol/comfoConnect.js';
import { opcodes } from './opcodes.js';
import { CLIENT_UUID, GATEWAY_PORT } from './consts.js';
import { ComfoControlHeader } from './comfoControlHeader.js';

export interface ComfoControlTransportOptions {
    /**
     * IP address of the device
     */
    address: string;
    /**
     * Port of the device defaults to 56747; see {@link GATEWAY_PORT} constant
     */
    port?: number;
    /**
     * UUID of the device encodes as HEX string of exactly 32 characters
     */
    uuid: string;
    /**
     * The UUID of the client; defaults to the default client UUID: see {@link CLIENT_UUID} constant
     */
    clientUuid?: string;
    /**
     * The interval in milliseconds to send keep-alive messages to the device; defaults to 30000ms
     */
    keepAliveInterval?: number;
}

enum ConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
}

/**
 * The ComfoControlTransport class is responsible for managing the connection to the ComfoControl device on the network.
 * It sends and receives messages to the device and emits events when messages are received.
 * Events:
 * - connect: emitted when the connection to the device is established
 * - message: emitted when a message is received from the device - the message is a ComfoControlMessage instance
 * - disconnect: emitted when the connection to the device is closed - the underlying socket is closed
 *
 */
export class ComfoControlTransport extends EventEmitter<{
    connect: [];
    message: [ComfoControlMessage];
    disconnect: [];
}> {
    private socket: Socket | null = null;
    private messageId: number = 0;
    private clientUuid: string;
    private keepAlive: number;
    private state: ConnectionState = ConnectionState.DISCONNECTED;
    private keepAliveHandle: NodeJS.Timeout | null = null;

    public get isConnected() {
        return this.state === ConnectionState.CONNECTED;
    }

    public get isConnecting() {
        return this.state === ConnectionState.CONNECTING;
    }

    /**
     * Create a new device instance with the specified details.
     * Use the static discover method to find devices on the network if you do not have the details.
     */
    constructor(
        private readonly options: ComfoControlTransportOptions,
        private readonly logger: Logger = new Logger('ComfoControlTransport'),
    ) {
        super();
        if (options.clientUuid && options.clientUuid.length > 32) {
            throw new Error('Client ID too long, must be a 32 characters hex string');
        }
        if (!options.uuid) {
            throw new Error('ComfoControl Server UUID is required to start the connection');
        }
        this.clientUuid = options.clientUuid ?? CLIENT_UUID;
        this.keepAlive = Math.max(options.keepAliveInterval ?? 30000, 5000);
    }

    public disconnect() {
        this.socket?.destroySoon();
    }

    public async connect(): Promise<this> {
        if (this.state !== ConnectionState.DISCONNECTED) {
            throw new Error('Cannot connect a transport that is already connected or connecting');
        }
        this.state = ConnectionState.CONNECTING;
        return new Promise((resolve, reject) => {
            const socket = new Socket();

            const onConnectError = (err: Error) => {
                this.logger.error('Error connecting transport:', err);
                this.state = ConnectionState.DISCONNECTED;
                this.socket = null;
                reject(err);
            };

            const onConnectSuccess = () => {
                this.logger.info(`Connected to ${this.options.address} on port ${this.options.port}`);

                socket.off('error', onConnectError);
                socket.on('data', this.onSocketData.bind(this));
                socket.on('error', this.onSocketError.bind(this));
                socket.on('close', this.onSocketClose.bind(this));
                socket.on('timeout', this.onSocketTimeout.bind(this));

                if (this.keepAlive > 0) {
                    // Transport layer will try to keep the connection alive by sending keep-alive messages
                    this.logger.info(`Starting keep-alive interval every ${this.keepAlive}ms`);
                    this.keepAliveHandle = setInterval(this.sendKeepAlive.bind(this), this.keepAlive);
                    this.socket?.setKeepAlive(true, Math.max(this.keepAlive, 15000));
                } else {
                    this.logger.info('Keep-alive disabled');
                }

                this.state = ConnectionState.CONNECTED;
                this.socket = socket;
                this.emit('connect');
                resolve(this);
            };

            // Connect and listen for connection events
            socket.once('error', onConnectError);
            socket.once('connect', onConnectSuccess);
            socket.connect(this.options.port ?? GATEWAY_PORT, this.options.address);
        });
    }

    public send<T extends keyof typeof opcodes, TRequest extends ReturnType<(typeof opcodes)[T]['create']>>(
        opcode: T,
        data: TRequest,
    ): Promise<number> {
        if (this.state !== ConnectionState.CONNECTED || this.socket === null) {
            throw new Error(
                'Cannot send data on a disconnected socket; connect the transport first before calling send',
            );
        }

        const refId = ++this.messageId;
        const messageBuffer = this.prepareMessage(opcode, refId, data);

        this.logger.verbose(`Send ${Opcode[opcode]} (${refId}) >>`, () => JSON.stringify(data));
        this.logger.debug(`Send ${Opcode[opcode]} (${refId}) >>`, () => messageBuffer.toString('hex'));

        const writtenLength = messageBuffer.readUint32BE(0) + 4;
        if (writtenLength !== messageBuffer.length) {
            throw new Error(
                `Failed to write message length to buffer; expected ${messageBuffer.length} but got ${writtenLength}`,
            );
        }

        return new Promise((resolve, reject) => {
            this.socket!.write(messageBuffer, (err) => {
                if (err) {
                    this.logger.error('Send error >>', err);
                    reject(err);
                } else {
                    resolve(refId);
                }
            });
        });
    }

    private prepareMessage<T extends keyof typeof opcodes, TRequest extends ReturnType<(typeof opcodes)[T]['create']>>(
        opcode: T,
        id: number,
        data: TRequest,
    ): Buffer {
        if (!opcodes[opcode]) {
            throw new Error(`Unsupported opcode: ${Opcode[opcode]}`);
        }
        const message = opcodes[opcode].toBinary.bind(opcodes[opcode])(data);
        const operation = GatewayOperation.toBinary({ opcode, id });
        const header = new ComfoControlHeader(this.clientUuid, this.options.uuid, operation.length, message.length);
        return Buffer.concat([header.toBinary(), operation, message]);
    }

    private onSocketData(data: Buffer): void {
        this.logger.debug('Recv >>', () => data.toString('hex'));

        try {
            const messages = ComfoControlMessage.fromBinary(data);
            messages.forEach((message) => {
                this.logger.verbose(`Recv ${message.opcodeName} (${message.id}) >>`, () =>
                    JSON.stringify(message.deserialize()),
                );
                this.emit('message', message);
            });
        } catch (err) {
            this.logger.error('Error processing message:', err);
        }
    }

    private onSocketClose(): void {
        this.logger.info('Transport socket disconnected');
        if (this.keepAliveHandle) {
            clearInterval(this.keepAliveHandle);
        }
        this.state = ConnectionState.DISCONNECTED;
        this.socket = null;
        this.emit('disconnect');
    }

    private onSocketError(err: Error): void {
        this.logger.error('Transport error:', err);
    }

    private onSocketTimeout(): void {
        this.logger.error('Transport timeout');
        this.socket?.destroy();
    }

    public sendKeepAlive() {
        this.send(Opcode.KEEP_ALIVE, {}).catch((err) => {
            this.logger.error('Error sending keep-alive:', err);
        });
    }
}
