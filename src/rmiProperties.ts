import { PropertyDataType } from './deviceProperties';

export enum NodeTypes {
    VENTILATION_UNIT = 1,
    OPTION_BOX = 2,
    COMFOCONTROL_GATEWAY = 55,
}

export enum ErrorCodes {
    NO_ERROR = 0,
    UNKNOWN_COMMAND = 11,
    UNKNOWN_UNIT = 12,
    UNKNOWN_SUBUNIT = 13,
    UNKNOWN_PROPERTY = 14,
    TYPE_CANNOT_HAVE_RANGE = 15,
    VALUE_NOT_IN_RANGE = 30,
    PROPERTY_NOT_GETTABLE_OR_SETTABLE = 32,
    INTERNAL_ERROR = 40,
    INTERNAL_ERROR_COMMAND_WRONG = 41,
}

export interface NodeProperty {
    node: NodeTypes;
    unit: UnitTypes;
    /**
     * Defaults to 1 when not specified.
     */
    subunit?: number;
    propertyId: number;
    dataType: PropertyDataType;
    access?: 'ro' | 'rw';
}

/**
 * Enum representing different node types.
 */
export enum UnitTypes {
    /** NODE: Represents the general node with attributes like serial nr, etc. (1 SubUnit) */
    NODE = 0x01,
    /** COMFOBUS: Unit responsible for comfobus-communication. Probably stores the ID's of connected devices. (1 SubUnit) */
    COMFOBUS = 0x02,
    /** ERROR: Stores errors, allows errors to be reset (1 SubUnit) */
    ERROR = 0x03,
    /** SCHEDULE: Responsible for managing Timers, the schedule, etc. Check here for level, bypass etc. (10 SubUnits) */
    SCHEDULE = 0x15,
    /** VALVE: ??? Bypass PreHeater and Extract (2 SubUnits) */
    VALVE = 0x16,
    /** FAN: Represents the two fans (supply, exhaust) (2 SubUnits) */
    FAN = 0x17,
    /** POWERSENSOR: Counts the actual wattage of ventilation and accumulates to year and since factory reset (1 SubUnit) */
    POWERSENSOR = 0x18,
    /** PREHEATER: Represents the optional preheater (1 SubUnit) */
    PREHEATER = 0x19,
    /** HMI: Represents the Display + Buttons (1 SubUnit) */
    HMI = 0x1a,
    /** RFCOMMUNICATION: Wireless-communication with attached devices (1 SubUnit) */
    RFCOMMUNICATION = 0x1b,
    /** FILTER: Counts the days since last filter change (1 SubUnit) */
    FILTER = 0x1c,
    /** TEMPHUMCONTROL: Controls the target temperature, if its cooling or heating period and some settings (1 SubUnit) */
    TEMPHUMCONTROL = 0x1d,
    /** VENTILATIONCONFIG: Responsible for managing various configuration options of the ventilation (1 SubUnit) */
    VENTILATIONCONFIG = 0x1e,
    /** NODECONFIGURATION: Manages also some options (1 SubUnit) */
    NODECONFIGURATION = 0x20,
    /** TEMPERATURESENSOR: Represents the 6 temperature sensors in the ventilation (6 SubUnits) */
    TEMPERATURESENSOR = 0x21,
    /** HUMIDITYSENSOR: Represents the 6 humidity sensors (6 SubUnits) */
    HUMIDITYSENSOR = 0x22,
    /** PRESSURESENSOR: Represents both pressure sensors (2 SubUnits) */
    PRESSURESENSOR = 0x23,
    /** PERIPHERALS: Stores the ID of the ComfoCool attached, can reset peripheral errors here (1 SubUnit) */
    PERIPHERALS = 0x24,
    /** ANALOGINPUT: Provides data and functionality for the analog inputs, also the scaling for the voltages (4 SubUnits) */
    ANALOGINPUT = 0x25,
    /** COOKERHOOD: "Dummy" unit, probably represents the ComfoHood if attached (1 SubUnit) */
    COOKERHOOD = 0x26,
    /** POSTHEATER: Represents the optional post heater attached (temperature sens, config) (1 SubUnit) */
    POSTHEATER = 0x27,
    /** COMFOFOND: "Dummy" unit, represents the optional comfofond (1 SubUnit) */
    COMFOFOND = 0x28,
}

/**
 * Known properties of each subunit.
 */
export const VentilationUnitProperties = {
    NODE: {
        // "UNKNOWN_1": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODE, propertyId: 0x01, dataType: PropertyDataType.CN_UINT8 },
        // "UNKNOWN_2": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODE, propertyId: 0x02, dataType: PropertyDataType.CN_UINT8 },
        // "UNKNOWN_3": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODE, propertyId: 0x03, dataType: PropertyDataType.CN_UINT8 },
        SERIAL_NUMBER: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.NODE,
            propertyId: 0x04,
            dataType: PropertyDataType.CN_STRING,
            access: 'ro',
        },
        // "UNKNOWN_5": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODE, propertyId: 0x05, dataType: PropertyDataType.CN_UINT8 },
        FIRMWARE_VERSION: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.NODE,
            propertyId: 0x06,
            dataType: PropertyDataType.CN_UINT32,
            access: 'ro',
        },
        // "UNKNOWN_7": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODE, propertyId: 0x07, dataType: PropertyDataType.CN_UINT32 },
        MODEL_NUMBER: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.NODE,
            propertyId: 0x08,
            dataType: PropertyDataType.CN_STRING,
            access: 'ro',
        },
        // "UNKNOWN_9": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODE, propertyId: 0x09, dataType: PropertyDataType.CN_UINT32 },
        // "UNKNOWN_10": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODE, propertyId: 0x0A, dataType: PropertyDataType.CN_UINT32 },
        ARTICLE_NUMBER: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.NODE,
            propertyId: 0x0b,
            dataType: PropertyDataType.CN_STRING,
            access: 'ro',
        },
        // "UNKNOWN_12": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODE, propertyId: 0x0C, dataType: PropertyDataType.CN_STRING },
        CURRENT_COUNTRY: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.NODE,
            propertyId: 0x0d,
            dataType: PropertyDataType.CN_STRING,
            access: 'ro',
        },
        VENTILATION_UNIT_NAME: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.NODE,
            propertyId: 0x14,
            dataType: PropertyDataType.CN_STRING,
            access: 'ro',
        },
    },
    TEMPHUMCONTROL: {
        // "UNKNOWN_1": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.TEMPHUMCONTROL, propertyId: 0x01, dataType: PropertyDataType.CN_UINT8 },
        RMOT_HEATING_PERIOD: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.TEMPHUMCONTROL,
            propertyId: 0x02,
            dataType: PropertyDataType.CN_INT16,
            access: 'rw',
        },
        RMOT_COOLING_PERIOD: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.TEMPHUMCONTROL,
            propertyId: 0x03,
            dataType: PropertyDataType.CN_INT16,
            access: 'rw',
        },
        PASSIVE_TEMPERATURE_CONTROL: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.TEMPHUMCONTROL,
            propertyId: 0x04,
            dataType: PropertyDataType.CN_UINT8,
            access: 'rw',
        },
        // "UNKNOWN_5": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.TEMPHUMCONTROL, propertyId: 0x05, dataType: PropertyDataType.CN_UINT8, access: "rw" },
        HUMIDITY_COMFORT_CONTROL: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.TEMPHUMCONTROL,
            propertyId: 0x06,
            dataType: PropertyDataType.CN_UINT8,
            access: 'rw',
        },
        HUMIDITY_PROTECTION: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.TEMPHUMCONTROL,
            propertyId: 0x07,
            dataType: PropertyDataType.CN_UINT8,
            access: 'rw',
        },
        // "UNKNOWN_8": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.TEMPHUMCONTROL, propertyId: 0x08, dataType: PropertyDataType.CN_UINT8, access: "rw" },
        TARGET_TEMPERATURE_HEATING: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.TEMPHUMCONTROL,
            propertyId: 0x0a,
            dataType: PropertyDataType.CN_INT16,
            access: 'rw',
        },
        TARGET_TEMPERATURE_NORMAL: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.TEMPHUMCONTROL,
            propertyId: 0x0b,
            dataType: PropertyDataType.CN_INT16,
            access: 'rw',
        },
        TARGET_TEMPERATURE_COOLING: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.TEMPHUMCONTROL,
            propertyId: 0x0c,
            dataType: PropertyDataType.CN_INT16,
            access: 'rw',
        },
        // "UNKNOWN_13": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.TEMPHUMCONTROL, propertyId: 0x0D, dataType: PropertyDataType.CN_UINT8 },
    },
    VENTILATIONCONFIG: {
        // "UNKNOWN_1": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x01, dataType: PropertyDataType.CN_UINT8 },
        // "UNKNOWN_2": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x02, dataType: PropertyDataType.CN_UINT8 },
        VENTILATION_SPEED_AWAY: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.VENTILATIONCONFIG,
            propertyId: 0x03,
            dataType: PropertyDataType.CN_INT16,
            access: 'rw',
        },
        VENTILATION_SPEED_LOW: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.VENTILATIONCONFIG,
            propertyId: 0x04,
            dataType: PropertyDataType.CN_INT16,
            access: 'rw',
        },
        VENTILATION_SPEED_MEDIUM: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.VENTILATIONCONFIG,
            propertyId: 0x05,
            dataType: PropertyDataType.CN_INT16,
            access: 'rw',
        },
        VENTILATION_SPEED_HIGH: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.VENTILATIONCONFIG,
            propertyId: 0x06,
            dataType: PropertyDataType.CN_INT16,
            access: 'rw',
        },
        HEIGHT_ABOVE_SEA_LEVEL: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.VENTILATIONCONFIG,
            propertyId: 0x07,
            dataType: PropertyDataType.CN_UINT8,
        },
        // "UNKNOWN_8": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x08, dataType: PropertyDataType.CN_INT16 },
        VENTILATION_CONTROL_MODE: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.VENTILATIONCONFIG,
            propertyId: 0x09,
            dataType: PropertyDataType.CN_UINT8,
        },
        // "UNKNOWN_10": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x0A, dataType: PropertyDataType.CN_INT16 },
        BATHROOM_SWITCH_ACTIVATION_DELAY: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.VENTILATIONCONFIG,
            propertyId: 0x0b,
            dataType: PropertyDataType.CN_INT16,
        },
        BATHROOM_SWITCH_DEACTIVATION_DELAY: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.VENTILATIONCONFIG,
            propertyId: 0x0c,
            dataType: PropertyDataType.CN_UINT8,
        },
        BATHROOM_SWITCH_MODE: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.VENTILATIONCONFIG,
            propertyId: 0x0d,
            dataType: PropertyDataType.CN_UINT8,
        },
        // "UNKNOWN_14": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x0E, dataType: PropertyDataType.CN_UINT8 },
        // "UNKNOWN_15": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x0F, dataType: PropertyDataType.CN_UINT8 },
        // "UNKNOWN_17": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x11, dataType: PropertyDataType.CN_INT16 },
        UNBALANCE: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.VENTILATIONCONFIG,
            propertyId: 0x12,
            dataType: PropertyDataType.CN_INT16,
        },
        // "UNKNOWN_19": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x13, dataType: PropertyDataType.CN_INT16 },
        // "UNKNOWN_20": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x14, dataType: PropertyDataType.CN_INT16 },
        // "UNKNOWN_21": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x15, dataType: PropertyDataType.CN_INT16 },
        // "UNKNOWN_22": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x16, dataType: PropertyDataType.CN_INT16 },
        // "UNKNOWN_23": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x17, dataType: PropertyDataType.CN_INT16 },
        // "UNKNOWN_24": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x18, dataType: PropertyDataType.CN_INT16 },
        // "UNKNOWN_25": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x19, dataType: PropertyDataType.CN_INT16 },
        // "UNKNOWN_26": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x1A, dataType: PropertyDataType.CN_INT16 },
        // "UNKNOWN_27": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x1B, dataType: PropertyDataType.CN_INT16 },
        // "UNKNOWN_28": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x1C, dataType: PropertyDataType.CN_INT16 },
        // "UNKNOWN_29": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x1D, dataType: PropertyDataType.CN_INT16 },
        // "UNKNOWN_30": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.VENTILATIONCONFIG, propertyId: 0x1E, dataType: PropertyDataType.CN_INT16 },
    },
    NODECONFIGURATION: {
        // "UNKNOWN_1": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODECONFIGURATION, propertyId: 0x01, dataType: PropertyDataType.CN_UINT8 },
        MAINTAINER_PASSWORD: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.NODECONFIGURATION,
            propertyId: 0x03,
            dataType: PropertyDataType.CN_STRING,
        },
        ORIENTATION: {
            node: NodeTypes.VENTILATION_UNIT,
            unit: UnitTypes.NODECONFIGURATION,
            propertyId: 0x04,
            dataType: PropertyDataType.CN_UINT8,
        },
        // "UNKNOWN_5": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODECONFIGURATION, propertyId: 0x05, dataType: PropertyDataType.CN_UINT8 },
        // "UNKNOWN_6": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODECONFIGURATION, propertyId: 0x06, dataType: PropertyDataType.CN_UINT8 },
        // "UNKNOWN_7": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODECONFIGURATION, propertyId: 0x07, dataType: PropertyDataType.CN_UINT8 },
        // "UNKNOWN_8": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODECONFIGURATION, propertyId: 0x08, dataType: PropertyDataType.CN_UINT8 },
        // "UNKNOWN_10": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODECONFIGURATION, propertyId: 0x0A, dataType: PropertyDataType.CN_UINT8 },
        // "UNKNOWN_11": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODECONFIGURATION, propertyId: 0x0B, dataType: PropertyDataType.CN_UINT8 },
        // "UNKNOWN_12": { node: NodeTypes.VENTILATION_UNIT, unit: UnitTypes.NODECONFIGURATION, propertyId: 0x0C, dataType: PropertyDataType.CN_UINT8 },
    },
} as const;
