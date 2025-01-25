import { Socket, createSocket } from 'node:dgram';
import { EventEmitter } from 'events';
import { DeferredPromise } from './util/deferredPromise';
import { GatewayDiscovery } from './protocol/comfoConnect';
import { Logger } from './util/logging/index';
import { DISCOVERY_PORT } from './consts';

export interface ComfoControlServerInfo {
    /**
     * IP address of the device
     */
    address: string;
    /**
     * Port of the device
     */
    port: number;
    /**
     * UUID of the device encodes as HEX string
     */
    uuid: string;
    /**
     * Version of the device
     */
    version: number;
    /**
     * MAC address of the device
     */
    mac: string;
}

/**
 * The discovery operation to find devices on the network. Sends a discovery message to one or more broadcast address
 * and listens for responses from devices. Uses UDP sockets to send and receive messages on the default discovery port (56747).
 *
 * For the discovery process to work, the devices must be on the same network segment as the host running the discovery operation.
 * If the network is segmented into multiple subnets, the discovery process will not work unless the router is configured to relay discovery message to other subnets.
 * By default routers do not relay broadcast messages between subnets.
 */
export class DiscoveryOperation extends EventEmitter implements Promise<ComfoControlServerInfo[]> {
    private readonly socket: Socket;
    private timeoutHandle: NodeJS.Timeout;
    private broadcastHandle: NodeJS.Timeout;
    private discoveryPromise?: DeferredPromise<ComfoControlServerInfo[]>;
    private discoveredDevices: ComfoControlServerInfo[] = [];
    private broadcastAddresses: string[];

    [Symbol.toStringTag]: string = 'DiscoveryOperation';

    constructor(
        broadcastAddresses: string[] | string,
        private port = DISCOVERY_PORT,
        private logger: Logger = new Logger('DiscoveryOperation'),
    ) {
        super();
        this.broadcastAddresses = Array.isArray(broadcastAddresses) ? broadcastAddresses : [broadcastAddresses];
        if (this.broadcastAddresses.length === 0) {
            throw new Error('At least one broadcast address must be provided');
        }
        this.socket = createSocket({ type: 'udp4', reuseAddr: true });
    }

    /**
     * Initiates the discovery process to find devices.
     * @param timeout - The duration in milliseconds to run the discovery before timing out.
     * @param abortSignal - Optional AbortSignal to cancel the discovery.
     * @returns The current instance of deviceDiscoveryOperation.
     * @throws Error if a discovery operation is already in progress.
     */
    public discover(options: { timeout: number; limit?: number }, abortSignal?: AbortSignal): this {
        if (this.discoveryPromise) {
            this.logger.error('Discovery operation already in progress');
            throw new Error('Discovery operation already in progress');
        }

        this.logger.info('Starting discovery process');
        this.discoveryPromise = new DeferredPromise();

        if (abortSignal) {
            abortSignal.addEventListener('abort', this.onAbort.bind(this));
        }

        this.socket.on('message', (msg, rinfo) => {
            if (abortSignal?.aborted) {
                this.onAbort();
                return;
            }
            this.logger.debug(`Received message from ${rinfo.address}:`, () => msg.toString('hex'));
            const device = this.parseDiscoveryResponse(msg);
            if (device && !this.discoveredDevices.some((b) => b.uuid === device.uuid)) {
                this.discoveredDevices.push(device);
                this.logger.info('Discovered device at', device.address, 'with UUID:', device.uuid);
                this.emit('discover', device);
                if (options.limit && this.discoveredDevices.length >= options.limit) {
                    this.logger.verbose(`Discovery limit (${options.limit}) reached`);
                    this.stop();
                }
            }
        });

        this.socket.on('error', this.onError.bind(this));

        this.socket.bind(() => {
            if (abortSignal?.aborted) {
                this.onAbort();
                return;
            }
            this.socket.setBroadcast(true);
            this.broadcastHandle = setInterval(() => this.sendDiscoveryMessages(), 2000);
            this.timeoutHandle = setTimeout(this.stop.bind(this), options.timeout);
        });

        return this;
    }

    private sendDiscoveryMessages() {
        const message = GatewayDiscovery.toBinary({ request: {} });
        for (const address of this.broadcastAddresses) {
            this.logger.debug(`Broadcast on ${address} (${this.port}):`, () => Buffer.from(message).toString('hex'));
            this.socket.send(message, 0, message.length, this.port, address, (err) => err && this.onError(err));
        }
    }

    private parseDiscoveryResponse(msg: Buffer): ComfoControlServerInfo | undefined {
        try {
            const { response } = GatewayDiscovery.fromBinary(msg, { readUnknownField: false });
            if (!response) {
                throw new Error('Invalid discovery response');
            }
            const uuid = Buffer.from(response.uuid).toString('hex');
            return {
                address: response.address,
                port: this.port,
                version: response.version,
                uuid,
                mac: uuid.slice(uuid.length - 12),
            };
        } catch (err) {
            this.onError(err);
        }
        return undefined;
    }

    private onError(error: Error) {
        this.logger.error('Error during discovery:', error.message);
        this.emit('error', error);
        this.discoveryPromise?.reject(error);
        this.cleanup();
    }

    private onAbort() {
        this.logger.warn('Discovery aborted');
        this.emit('abort');
        this.discoveryPromise?.reject(new Error('Discovery aborted'));
        this.cleanup();
    }

    private stop() {
        this.logger.info('Discovery stopped');
        this.discoveryPromise?.resolve(this.discoveredDevices);
        this.emit('completed', this.discoveryPromise);
        this.cleanup();
    }

    private cleanup(): void {
        this.logger.debug('Cleaning up discovery operation');
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
        }
        clearInterval(this.broadcastHandle);
        this.discoveryPromise = undefined;
        this.socket.close();
    }

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled - The callback to execute when the Promise is resolved.
     * @param onrejected - The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    then<TResult1 = ComfoControlServerInfo[], TResult2 = never>(
        onfulfilled?: (value: ComfoControlServerInfo[]) => TResult1 | PromiseLike<TResult1>,
        onrejected?: (reason: unknown) => TResult2 | PromiseLike<TResult2>,
    ): Promise<TResult1 | TResult2> {
        if (!this.discoveryPromise) {
            return Promise.reject(new Error('No discovery operation in progress'));
        }
        return this.discoveryPromise.then(onfulfilled, onrejected);
    }

    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected - The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(
        onrejected?: (reason: unknown) => TResult | PromiseLike<TResult>,
    ): Promise<ComfoControlServerInfo[] | TResult> {
        if (!this.discoveryPromise) {
            return Promise.reject(new Error('No discovery operation in progress'));
        }
        return this.discoveryPromise.catch(onrejected);
    }

    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected).
     * @param onfinally - The callback to execute when the Promise is settled.
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: () => void): Promise<ComfoControlServerInfo[]> {
        if (!this.discoveryPromise) {
            return Promise.reject(new Error('No discovery operation in progress'));
        }
        return this.discoveryPromise.finally(onfinally);
    }
}
