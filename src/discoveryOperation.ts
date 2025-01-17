import dgram from 'node:dgram';
import { EventEmitter } from 'events';
import { DeferredPromise } from './util/deferredPromise.js';
import { GatewayDiscovery } from './protocol/comfoConnect.js';
import { Logger } from './util/logging';

/**
 * The default port the LAN-C gateway listens on for discovery messages.
 */
const DISCOVERY_PORT = 56747;

export interface BridgeDetails {
    /**
     * IP address of the bridge
     */
    address: string;
    /**
     * UUID of the bridge encodes as HEX string
     */
    uuid: string;
    /**
     * Version of the bridge
     */
    version: number;
    /**
     * MAC address of the bridge
     */
    mac: string;
}

/**
 * The discovery operation to find bridges on the network. Sends a discovery message to one or more broadcast address
 * and listens for responses from bridges. Uses UDP sockets to send and receive messages on the default discovery port (56747).
 * 
 * For the discovery process to work, the bridges must be on the same network segment as the host running the discovery operation. 
 * If the network is segmented into multiple subnets, the discovery process will not work unless the router is configured to relay discovery message to other subnets. 
 * By default routers do not relay broadcast messages between subnets.
 */
export class BridgeDiscoveryOperation extends EventEmitter implements Promise<BridgeDetails[]> {
    private readonly socket: dgram.Socket;
    private timeoutHandle: NodeJS.Timeout;
    private broadcastHandle: NodeJS.Timeout;
    private discoveryPromise: DeferredPromise<BridgeDetails[]>;
    private discoveredBridges: BridgeDetails[] = [];
    private broadcastAddresses: string[];

    [Symbol.toStringTag]: string = 'BridgeDiscoveryOperation';

    constructor(
        broadcastAddresses: string[] | string,
        private logger: Logger = new Logger('BridgeDiscoveryOperation')
    ) {
        super();
        this.broadcastAddresses = Array.isArray(broadcastAddresses) ? broadcastAddresses : [ broadcastAddresses ];
        if (this.broadcastAddresses.length === 0) {
            throw new Error('At least one broadcast address must be provided');
        }
        this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    }

    /**
     * Initiates the discovery process to find bridges.
     * @param timeout - The duration in milliseconds to run the discovery before timing out.
     * @param abortSignal - Optional AbortSignal to cancel the discovery.
     * @returns The current instance of BridgeDiscoveryOperation.
     * @throws Error if a discovery operation is already in progress.
     */
    public discover(options: { timeout: number, limit?: number }, abortSignal?: AbortSignal): this {
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
            const bridge = this.parseDiscoveryResponse(msg);
            if (bridge && !this.discoveredBridges.some(b => b.uuid === bridge.uuid)) {
                this.discoveredBridges.push(bridge);
                this.logger.info('Discovered bridge at', bridge.address, 'with UUID:', bridge.uuid);
                this.emit('discover', bridge);
                if (options.limit && this.discoveredBridges.length >= options.limit) {
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
            this.logger.debug(`Broadcast on ${address} (${DISCOVERY_PORT}):`, () => Buffer.from(message).toString('hex'));
            this.socket.send(
                message, 0, message.length,
                DISCOVERY_PORT, address, 
                (err) => err && this.onError(err)
            );
        }
    }

    private parseDiscoveryResponse(msg: Buffer): BridgeDetails | undefined {
        try {
            const { response } = GatewayDiscovery.fromBinary(msg, { readUnknownField: true });
            const uuid = Buffer.from(response.uuid).toString('hex');
            return {
                address: response.address,
                version: response.version,
                uuid,
                mac: uuid.slice(uuid.length - 12)
            }
        } catch(err) {
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
        this.discoveryPromise.resolve(this.discoveredBridges);
        this.emit('completed', this.discoveryPromise);
        this.cleanup();
    }

    private cleanup(): void {
        this.logger.debug('Cleaning up discovery operation');
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
        }
        clearInterval(this.broadcastHandle);
        this.discoveryPromise = null;
        this.socket.close();
    }

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled - The callback to execute when the Promise is resolved.
     * @param onrejected - The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    then<TResult1 = BridgeDetails[], TResult2 = never>(
        onfulfilled?: (value: BridgeDetails[]) => TResult1 | PromiseLike<TResult1>, 
        onrejected?: (reason: unknown) => TResult2 | PromiseLike<TResult2>
    ): Promise<TResult1 | TResult2> {
        return this.discoveryPromise.then(onfulfilled, onrejected);
    }

    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected - The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: (reason: unknown) => TResult | PromiseLike<TResult>): Promise<BridgeDetails[] | TResult> {
        return this.discoveryPromise.catch(onrejected);
    }

    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected).
     * @param onfinally - The callback to execute when the Promise is settled.
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: () => void): Promise<BridgeDetails[]> {
        return this.discoveryPromise.finally(onfinally);
    }
}