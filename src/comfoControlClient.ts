import { DiscoveryOperation } from './discoveryOperation';
import { NetworkUtils } from './util/networkUtils';
import { Logger } from './util/logging/index';
import { Opcode, Result } from './protocol/comfoConnect';
import { DeferredPromise } from './util/deferredPromise';
import { OpcodeMessageType, requestMessages } from './opcodes';
import { ComfoControlMessage } from './comfoControlMessage';
import { ComfoControlTransport } from './comfoControlTransport';
import { NodeProductType } from './consts';
import { DeviceProperty, DevicePropertyType, getPropertyName, getPropertyValue } from './deviceProperties';
import { removeArrayElement } from './util/arrayUtils';

export interface DiscoverOptions {
    broadcastAddresses?: string | string[];
    port?: number;
    timeout?: number;
    limit?: number;
    abortSignal?: AbortSignal;
}

export interface ComfoControlClientOptions {
    /**
     * IP address of the device
     */
    address: string;
    /**
     * Port of the device, defaults to 56747 if not set
     */
    port?: number;
    /**
     * UUID of the device encodes as HEX string
     */
    uuid: string;
    /**
     * The name of the device that is connecting to the device.
     * If not specified, the hostname of the device will be used.
     */
    deviceName?: string;
    /**
     * 12 byte client ID that is unique to this device.
     */
    clientUuid?: string;
    /**
     * 4 character PIN code to authenticate with the device. Defaults to 0 when not specified.
     */
    pin?: number;
}

interface ComfoControlNode {
    /**
     * The ID of the node.
     */
    id: number;
    /**
     * The product type of the node.
     */
    productType: NodeProductType;
    /**
     * The zone ID of the node.
     */
    zoneId: number;
    /**
     * The mode of the node.
     */
    mode: number;
}

/**
 * Opcodes that are exempt from the session check.
 */
const SESSION_EXEMPT_OPCODES = [Opcode.REGISTER_DEVICE_REQUEST, Opcode.START_SESSION_REQUEST, Opcode.KEEP_ALIVE];

/**
 * The state of the session with the device.
 */
enum SessionState {
    None,
    Registering,
    Active,
}

export interface DevicePropertyListner<P extends DeviceProperty = DeviceProperty> {
    (update: { readonly propertyName: string; readonly value: DevicePropertyType<P> } & DeviceProperty): unknown;
}

type OpcodeResponse<T extends Opcode> = T extends keyof (typeof requestMessages) 
    ? (typeof requestMessages)[T] extends Opcode.NO_OPERATION ? void : ComfoControlMessage<(typeof requestMessages)[T]>
    : void;

/**
 * Represents a client that manages a connection with a ComfoControl Gateway Device.
 *
 * Provides methods to discover devices, start and maintain sessions,
 * register property listeners, and interact with the device.
 *
 * @example
 * ```typescript
 * const client = new ComfoControlClient({
 *   address: '192.168.1.100',
 *   uuid: '1234567890abcdef1234567890abcdef',
 *   pin: 1234,
 * });
 * 
 * await client.startSession(); 
 * console.log('Session started:', client.sessionActive);
 * ```
 * @remarks
 * - Make sure to handle errors for production use.
 * - Register property listeners to receive real-time updates.
 *
 * @public
 */
export class ComfoControlClient {
    private transport: ComfoControlTransport;
    private pendingReplies: Record<number, DeferredPromise<ComfoControlMessage>> = {};
    private sessionState = SessionState.None;
    private nodes: Record<number, ComfoControlNode> = {};
    private deviceName: string;

    private deviceProperties: Record<number, {
        listners: Array<DevicePropertyListner>,
        propertyName: string,
        registered: boolean,
    } & DeviceProperty> = {};

    /**
     * Defines handlers for specific opcodes that are received from the server without a preceding request.
     */
    private handlers: Partial<Record<Opcode, (message: ComfoControlMessage) => void | Promise<void>>> = {
        [Opcode.CLOSE_SESSION_REQUEST]: this.onSessionClosed.bind(this),
        [Opcode.CN_NODE_NOTIFICATION]: this.onNodeNotification.bind(this),
        [Opcode.CN_RPDO_NOTIFICATION]: this.onPropertyUpdateNotification.bind(this),
        [Opcode.GATEWAY_NOTIFICATION]: this.onNotification.bind(this),
        [Opcode.CN_ALARM_NOTIFICATION]: this.onNotification.bind(this),
    };

    public get sessionActive() {
        return this.sessionState === SessionState.Active;
    }

    /**
     * Create a new device instance with the specified details.
     * Use the static discover method to find devices on the network if you do not have the details.
     */
    constructor(
        private readonly options: ComfoControlClientOptions,
        private readonly logger: Logger = new Logger('ComfoAirDevice'),
    ) {
        this.deviceName = options.deviceName ?? NetworkUtils.getHostname() ?? 'ComfoControlClient';
        this.transport = new ComfoControlTransport(options, this.logger.createLogger('Transport'));
        this.transport.on('message', (message) => this.processMessage(message));
        this.transport.on('disconnect', () => (this.sessionState = SessionState.None));
    }

    /**
     * Discover devices on the network using a {@link DiscoveryOperation}. The discovery process will run for the specified timeout or until the limit of devices is reached.
     * If no timeout is specified, the default timeout is 30 seconds. If no limit is specified, all discovered devices will be returned.
     * The operation can be aborted using an AbortSignal, see {@link https://nodejs.org/api/globals.html#class-abortsignal} for details on how to use the AbortSignal.
     * @param options - The options for the discovery process.
     * @returns A {@link DiscoveryOperation} instance that can be used to listen for discovered devices.
     */
    static discover(options?: DiscoverOptions): DiscoveryOperation {
        return new DiscoveryOperation(options?.broadcastAddresses ?? NetworkUtils.getBroadcastAddresses()).discover(
            {
                timeout: options?.timeout ?? 30000,
                limit: options?.limit,
            },
            options?.abortSignal,
        );
    }

    /**
     * Starts a session with the ComfoControl device. Normally you should not need to call this method directly,
     * as it is called automatically when sending a request that requires an active session.
     *
     * Registers the device/app and starts a session if not already active.
     * Re-registers all properties that were registered before the session was closed.
     *
     * - When you get a `Failed to start session: NOT_ALLOWED` error the client UUID is not accepted by the server,
     * to fix this use the default UUID by not setting the `clientUuid` option.
     * - When you get a `Failed to register: NOT_ALLOWED` the device PIN code is incorrect.
     *
     * @returns {Promise<void>} A promise that resolves when the session is successfully started.
     * @throws Will throw an error if the session is already active or in the process of starting, or if the registration or session start fails.
     */
    public async startSession(): Promise<void> {
        if (this.sessionState !== SessionState.None) {
            throw new Error('Session is already active or in the process of starting');
        }

        this.logger.info(`Registering with server as: ${this.deviceName}`);
        this.sessionState = SessionState.Registering;

        try {
            const registerResponse = await this.send(Opcode.REGISTER_DEVICE_REQUEST, {
                deviceName: this.deviceName,
                pin: this.options.pin ?? 0,
                uuid: Buffer.from(this.options.uuid, 'hex'),
            });
            if (registerResponse.resultCode !== Result.OK) {
                throw new Error(`Failed to register: ${registerResponse.resultName}`);
            }

            const sessionResponse = await this.send(Opcode.START_SESSION_REQUEST, { takeover: true });
            if (sessionResponse.resultCode !== Result.OK) {
                throw new Error(`Failed to start session: ${sessionResponse.resultName}`);
            }
        } catch (err) {
            this.sessionState = SessionState.None;
            throw err;
        }

        this.logger.info('Session started with device');
        this.sessionState = SessionState.Active;

        // Re-register all properties that were registered before the session was closed
        for (const info of Object.values(this.deviceProperties).filter((p) =>p.registered)) {
            // Do not await re-registration to avoid blocking the session start
            this.requestPropertyUpdates(info).catch(() => {
                this.logger.warn(`Failed to re-register property: ${info.propertyName ?? 'UNKNOWN'} (${info.propertyId})`);
            });
        }
    }

    /**
     * Sends a request to the ComfoControl device and waits for a response.
     * Ensures the transport is connected and the session is active before sending the request.
     *
     * @template T - The type of the request opcode.
     * @template R - The type of the response message.
     * @template TRequest - The type of the request data.
     * @param {T} opcode - The opcode of the request.
     * @param {TRequest} [data] - The data to send with the request.
     * @returns {Promise<ComfoControlMessage<R>>} A promise that resolves to the response message.
     * @throws Will throw an error if the transport is already connecting, the session is not active, or the response opcode is unexpected.
     */
    public async send<T extends keyof typeof requestMessages>(opcode: T, data?: OpcodeMessageType<T>): Promise<OpcodeResponse<T>> {
        await this.ensureConnected(opcode);
        const responseOpcode = requestMessages[opcode];
        const requestId = await this.transport.send(opcode, data ?? ({} as OpcodeMessageType<T>));

        if (!responseOpcode || responseOpcode === Opcode.NO_OPERATION) {
            return void 0 as OpcodeResponse<T>;
        }

        this.pendingReplies[requestId] = new DeferredPromise<ComfoControlMessage>();
        return this.pendingReplies[requestId].then((response) => {
            delete this.pendingReplies[requestId];
            if (response.opcode !== responseOpcode) {
                throw new Error(
                    `Unexpected response opcode: ${Opcode[response.opcode]} (expected: ${Opcode[responseOpcode]})`,
                );
            }
            return response as unknown as OpcodeResponse<T>;
        });
    }

    private async ensureConnected(opcode: Opcode): Promise<void> {
        // Ensure the transport is connected
        if (!this.transport.isConnected) {
            if (this.transport.isConnecting) {
                throw new Error('Transport is already connecting');
            }
            await this.transport.connect();
        }

        // Ensure the session is active
        if (!this.sessionActive && !SESSION_EXEMPT_OPCODES.includes(opcode)) {
            await this.startSession();
        }
    }

    private async processMessage(message: ComfoControlMessage) {
        this.logger.verbose(`Recv ${message.opcodeName} (ID: ${message.id}) >> ${message.resultName}`);
        const responsePromise = this.pendingReplies[message.id];
        if (responsePromise) {
            //throw new Error(`Received response for unknown request ID: ${message.id} (${message.opcodeName}})`);
            responsePromise.resolve(message);
        } else if (this.handlers[message.opcode]) {
            try {
                await this.handlers[message.opcode]!(message);
            } catch (err) {
                this.logger.error('Error processing message:', err);
            }
        }
    }

    private onNodeNotification(message: ComfoControlMessage<Opcode.CN_NODE_NOTIFICATION>) {
        const notification = message.deserialize();
        this.logger.info(`Found ${NodeProductType[notification.productId]} (${notification.nodeId})`);
        this.nodes[notification.nodeId] = {
            id: notification.nodeId,
            productType: notification.productId,
            zoneId: notification.zoneId,
            mode: notification.mode,
        };
    }

    private onPropertyUpdateNotification(message: ComfoControlMessage<Opcode.CN_RPDO_NOTIFICATION>) {
        const notification = message.deserialize();
        const info = this.deviceProperties[notification.pdid];

        if (!info) {
            this.logger.warn(`Received update for unregistered property: ${getPropertyName(notification.pdid) ?? 'UNKNOWN'} (${notification.pdid})`);
            return;
        }

        const value = getPropertyValue(info, Buffer.from(notification.data));
        for (const listener of info.listners) {
            listener({ 
                propertyId: info.propertyId,
                propertyName: info.propertyName,
                dataType: info.dataType,
                value,
            });
        }
    }

    private onNotification() {}

    private onSessionClosed() {
        this.logger.info('Session closed by ComfoControl server');
        this.sessionState = SessionState.None;
        this.transport.disconnect();
    }

    /**
     * Retrieves the current server time from the ComfoControl device.
     * Sends a CN_TIME_REQUEST opcode to the device and processes the response to get the current time.
     * The time is returned as a Date object.
     *
     * @returns {Promise<Date>} A promise that resolves to the current server time as a Date object.
     * @throws Will throw an error if the request fails or the response is invalid.
     */
    public async getServerTime(): Promise<Date> {
        const response = await this.send(Opcode.CN_TIME_REQUEST);
        const msg = response.deserialize();
        return new Date(new Date(2000, 1, 1).getTime() + msg.currentTime * 1000);
    }

    /**
     * Registers a listener for updates to a specific device property.
     * Sends a CN_RPDO_REQUEST opcode to request updates for the specified property.
     * The listener will be called whenever the property value is updated.
     *
     * @param {T} property - The property to listen for updates on.
     * @param {DevicePropertyListner} listener - The listener function to call when the property is updated.
     * @returns {Promise<void>} A promise that resolves when the property listener is successfully registered.
     * @throws Will throw an error if the request to register the property updates fails.
     */
    public async registerPropertyListener<T extends DeviceProperty>(
        property: T,
        listener: DevicePropertyListner<T>,
    ): Promise<void> {
        const info = this.getDevicePropertyInfo(property);        
        info.listners.push(listener);
        try {
            await this.requestPropertyUpdates(property);
        } catch (err) {
            removeArrayElement(info.listners, listener);
            throw err;
        }
    }

    private async requestPropertyUpdates(property: DeviceProperty) {        
        await this.send(Opcode.CN_RPDO_REQUEST, {
            pdid: property.propertyId,
            zone: 1,
            type: property.dataType,
            timeout: 0,
        });
        this.getDevicePropertyInfo(property).registered = true;
    }

    private getDevicePropertyInfo(property: DeviceProperty) {
        return this.deviceProperties[property.propertyId] ?? (
            this.deviceProperties[property.propertyId] = {
                ...property,
                propertyName: getPropertyName(property.propertyId) ?? 'UNKNOWN',
                listners: [],
                registered: false,
            }
        );
    }
}
