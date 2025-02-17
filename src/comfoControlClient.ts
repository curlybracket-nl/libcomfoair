import { DiscoveryOperation } from './discoveryOperation';
import { NetworkUtils } from './util/networkUtils';
import { Logger, LogLevel } from './util/logging/index';
import { Opcode, Result } from './protocol/comfoConnect';
import { DeferredPromise } from './util/deferredPromise';
import { OpcodeMessageType, requestMessages } from './opcodes';
import { ComfoControlMessage } from './comfoControlMessage';
import { ComfoControlTransport } from './comfoControlTransport';
import { NodeProductType } from './consts';
import {
    DeviceProperty,
    PropertyNativeType,
    getPropertyName,
    deserializePropertyValue,
    serializePropertyValue,
} from './deviceProperties';
import { removeArrayElement } from './util/arrayUtils';
import { timeout } from './util/asyncUtils';
import { ErrorCodes, NodeProperty } from './rmiProperties';

export interface ComfoControlLogger {
    log(message: string, ...args: unknown[]): void;
}

interface LoggingOptions {
    /**
     * Logger instance to use for logging messages.
     */
    logger?: ComfoControlLogger;
    /**
     * Log level to use for logging messages.
     */
    logLevel?: LogLevel;
}

export interface DiscoverOptions extends LoggingOptions {
    broadcastAddresses?: string | string[];
    port?: number;
    timeout?: number;
    limit?: number;
    abortSignal?: AbortSignal;
}

export interface ComfoControlClientOptions extends LoggingOptions {
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
    /**
     * Timeout in milliseconds to wait for a response or confirmation from the device. Defaults to 15000ms.
     * If the device does not respond within this time, the request will be considered failed and the {@link send} method will reject the promise.
     */
    requestTimeout?: number;
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

export enum FanMode {
    Away = 0,
    Low = 1,
    Medium = 2,
    High = 3,
}

export enum TemperatureProfile {
    Normal = 0,
    Cool = 1,
    Warm = 2,
}

export enum OperationMode {
    Manual = 1,
    Auto = 0
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
    (update: { readonly propertyName: string; readonly value: PropertyNativeType<P>, readonly raw: Buffer } & DeviceProperty): unknown;
}

type OpcodeResponse<T extends Opcode> = T extends keyof typeof requestMessages
    ? (typeof requestMessages)[T] extends Opcode.NO_OPERATION
        ? void
        : ComfoControlMessage<(typeof requestMessages)[T]>
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

    private deviceProperties: Record<
        number,
        {
            listners: Array<DevicePropertyListner>;
            propertyName: string;
            registered: boolean;
        } & DeviceProperty
    > = {};

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
        ComfoControlClient.wrapLogger(this.logger, options);
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
        return new DiscoveryOperation(
            options?.broadcastAddresses ?? NetworkUtils.getBroadcastAddresses(),
            options?.port,
            ComfoControlClient.wrapLogger(new Logger('DiscoveryOperation'), options),
        ).discover(
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
        for (const info of Object.values(this.deviceProperties).filter((p) => p.registered)) {
            // Do not await re-registration to avoid blocking the session start
            this.requestPropertyUpdates(info).catch(() => {
                this.logger.warn(
                    `Failed to re-register property: ${info.propertyName ?? 'UNKNOWN'} (${info.propertyId})`,
                );
            });
        }
    }

    /**
     * Call this method to stop the session with the ComfoControl Gateway.
     */
    public async stopSession(): Promise<void> {
        if (this.sessionState === SessionState.None) {
            return;
        }

        this.logger.info('Closing session with device');
        this.sessionState = SessionState.None;

        try {
            await this.send(Opcode.CLOSE_SESSION_REQUEST);
        } catch (err) {
            this.logger.error('Failed to close session:', err);
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
    public async send<T extends keyof typeof requestMessages>(
        opcode: T,
        data?: OpcodeMessageType<T>,
    ): Promise<OpcodeResponse<T>> {
        await this.ensureConnected(opcode);
        const responseOpcode = requestMessages[opcode];
        const requestId = await this.transport.send(opcode, data ?? ({} as OpcodeMessageType<T>));

        if (!responseOpcode || responseOpcode === Opcode.NO_OPERATION) {
            return void 0 as OpcodeResponse<T>;
        }

        this.pendingReplies[requestId] = new DeferredPromise<ComfoControlMessage>();
        this.pendingReplies[requestId].finally(() => delete this.pendingReplies[requestId]);

        return timeout(
            this.pendingReplies[requestId].then((response) => {
                if (response.opcode !== responseOpcode) {
                    throw new Error(
                        `Unexpected response opcode: ${Opcode[response.opcode]} (expected: ${Opcode[responseOpcode]})`,
                    );
                }
                return response as unknown as OpcodeResponse<T>;
            }),
            this.options.requestTimeout ?? 15000,
            'Gateway did not response within the specified timeout period',
        );
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
            this.logger.warn(
                `Received update for unregistered property: ${getPropertyName(notification.pdid) ?? 'UNKNOWN'} (${notification.pdid})`,
            );
            return;
        }

        const raw = Buffer.from(notification.data);
        const value = deserializePropertyValue(info, raw);
        for (const listener of info.listners) {
            listener({
                propertyId: info.propertyId,
                propertyName: info.propertyName,
                dataType: info.dataType,
                value: info.convert?.(value) ?? value, 
                raw
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
        return (
            this.deviceProperties[property.propertyId] ??
            (this.deviceProperties[property.propertyId] = {
                ...property,
                propertyName: getPropertyName(property.propertyId) ?? 'UNKNOWN',
                listners: [],
                registered: false,
            })
        );
    }

    private static wrapLogger(logger: Logger, options?: LoggingOptions): Logger {
        if (options?.logger) {
            logger.addPrinter({
                printLine: (_level, _name, message, args) => options.logger?.log(message, args),
            });
        }
        if (options?.logLevel) {
            logger.setLogLevel(options.logLevel);
        }
        return logger;
    }

    /**
     * Reads an RMI property from the device. Predefined readable properties are available in the {@link VentilationUnitProperties} class.
     *
     * @example
     * ```typescript
     * const serial = await client.readProperty(VentilationUnitProperties.NODE.SERIAL_NUMBER);
     * console.log(`Serial number: ${serial}`);
     * ```
     *
     * @param prop The property to read.
     * @returns A promise that resolves to the value of the property.
     */
    public async readProperty<T extends NodeProperty>(prop: T): Promise<PropertyNativeType<T>> {
        return deserializePropertyValue(prop, await this.readPropertyRawValue(prop));
    }

    public async readPropertyRawValue(prop: NodeProperty): Promise<Buffer> {
        const response = await this.send(Opcode.CN_RMI_REQUEST, {
            nodeId: prop.node,
            message: Buffer.from([0x01, prop.unit, prop.subunit ?? 1, 0x10, prop.propertyId]),
        });
        const responseMessage = response.deserialize();

        if (responseMessage.result !== ErrorCodes.NO_ERROR) {
            throw new Error(
                `Failed to read property: ${ErrorCodes[responseMessage.result] ?? 'UNKNOWN'} (${responseMessage.result})`,
            );
        }

        return Buffer.from(responseMessage.message);
    }

    // public async readProperties<T extends NodeProperty>(props: T[]) : Promise<PropertyNativeType<T>> {
    //     if (props.length > 8) {
    //         throw new Error('Cannot read more than 8 properties at once');
    //     }

    //     const targets = props.map(prop => [prop.node, prop.unit, prop.subunit ?? 1].join(':'));
    //     if (new Set(targets).size > 1) {
    //         throw new Error('Properties must be from the same node, unit and subunit');
    //     }

    //     const response = await this.send(Opcode.CN_RMI_REQUEST, {
    //         nodeId: props[0].node,
    //         message: Buffer.from([0x02, props[0].unit, props[0].subunit ?? 1, 0x10 | props.length, ...props.map(p => p.propertyId)]),
    //     });
    //     const responseMessage = response.deserialize();
    // }

    /**
     * Writes a property to the device. Predefined writable properties are available in the {@link VentilationUnitProperties} class.
     *
     * This methods executes a write operation on the device and waits for a comfirmation from the gateway that the operation was successful.
     * If the operation fails, an error will be thrown. See {@link ErrorCodes} for a list of possible error codes that can be thrown.
     *
     * @param prop The property to write.
     * @param value The value to write to the property.
     */
    public async writeProperty<T extends NodeProperty>(prop: T, value: PropertyNativeType<T>): Promise<void> {
        if (prop.access === 'ro') {
            throw new Error(
                `Property ${prop.node}:${prop.unit}:${prop.subunit ?? 1}:${prop.propertyId} is read-only and cannot be written.`,
            );
        }

        const message = Buffer.concat([
            Buffer.from([0x03, prop.unit, prop.subunit ?? 1, prop.propertyId]),
            serializePropertyValue(prop, value),
        ]);

        const response = await this.send(Opcode.CN_RMI_REQUEST, { nodeId: prop.node, message });
        const responseMessage = response.deserialize();

        if (responseMessage.result !== ErrorCodes.NO_ERROR) {
            throw new Error(
                `Failed to write property: ${ErrorCodes[responseMessage.result] ?? 'UNKNOWN'} (${responseMessage.result})`,
            );
        }
    }

    /**
     * Sets the fan mode of the ventilation unit.
     * @param mode The fan mode to set.
     */
    public setFanMode(mode: FanMode): Promise<void> {
        if (mode < FanMode.Away || mode > FanMode.High) {
            throw new Error(`Invalid fan mode: ${mode}`);
        }
        return this.executeRmiCommand(
            0x84, 0x15, 1, 1,
            0, 0, 0, 0,
            1, 0, 0, 0, mode
        );
    }

    /**
     * Enables or disables bypass of the heat exchanger for the ventilation unit when true or 
     * resets the bypass to automatic mode when false.
     * @param bypassEnabled True to enable bypass, false to set to automatic mode.
     */
    public enableBypass(bypassEnabled: boolean): Promise<void> {
        if (bypassEnabled === true) {
            return this.executeRmiCommand(
                0x84, 0x15, 2, 1,
                0, 0, 0, 0,
                0x10, 0x0e, 0, 0, 1
            );
        }
        return this.executeRmiCommand(
            0x84, 0x15, 2, 1
        );        
    }

    /**
     * Set the temperature profile for the ventilation unit.
     * @param profile The temperature profile to set.
     */
    public setTempratureProfile(profile: TemperatureProfile): Promise<void> {
        if (TemperatureProfile[profile] === undefined) {
            throw new Error(`Invalid temperature profile: ${profile}`);
        }
        return this.executeRmiCommand(
            0x84, 0x15, 3, 1,
            0, 0, 0, 0,
            0xff, 0xff, 0xff, 0xff, profile
        );
    }

    /**
     * Sets the operating mode of the ventilation unit.
     * @param mode The operating mode to set.
     */
    public setOperatingMode(mode: OperationMode): Promise<void> {
        switch (mode) {
            case OperationMode.Auto:
                return this.executeRmiCommand(
                    0x84, 0x15, 8, 0
                );
            case OperationMode.Manual:
                return this.executeRmiCommand(
                    0x84, 0x15, 8, 1,
                    0, 0, 0, 0,
                    1, 0, 0, 0, 1
                );
            default:
                throw new Error(`Invalid operation mode: ${mode}`);
        }
    }

    public async executeRmiCommand(...bytes: number[]): Promise<void> {
        const message = Buffer.from(bytes);

        const response = await this.send(Opcode.CN_RMI_REQUEST, { nodeId: 1, message });
        const responseMessage = response.deserialize();

        if (responseMessage.result !== ErrorCodes.NO_ERROR) {
            throw new Error(
                `Failed to execute command: ${ErrorCodes[responseMessage.result] ?? 'UNKNOWN'} (${responseMessage.result})`,
            );
        }
    }
}
