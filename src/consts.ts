/**
 * Default ComfoAir Client UUID used by the App.
 */
export const CLIENT_UUID = '20200428000000000000000009080407';

/**
 * The default port the LAN-C gateway listens on for client connections (TCP)
 */
export const GATEWAY_PORT = 56747;

/**
 * The default port the LAN-C gateway listens on for discovery messages (UDP)
 */
export const DISCOVERY_PORT = 56747;

/**
 * Enum representing different product types.
 */
export enum NodeProductType {
    /**
     * The ComfoAirQ ventilation unit.
     */
    ComfoAirQ = 1,

    /**
     * ComfoSense C.
     */
    ComfoSense = 2,

    /**
     * ComfoSwitch C.
     */
    ComfoSwitch = 3,

    /**
     * OptionBox.
     */
    OptionBox = 4,

    /**
     * ComfoConnect LAN C.
     */
    ZehnderGateway = 5,

    /**
     * ComfoCool Q600.
     */
    ComfoCool = 6,

    /**
     * ComfoConnect KNX C.
     */
    KNXGateway = 7,

    /**
     * Service Tool.
     */
    ServiceTool = 8,

    /**
     * Production test tool.
     */
    PTTool = 9,

    /**
     * Design verification test tool.
     */
    DVTTool = 10,
}
