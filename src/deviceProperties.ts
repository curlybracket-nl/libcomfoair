/**
 * Enum representing different data types.
 */
export enum PropertyDataType {
    CN_BOOL = 0 /** CN_BOOL: `00` (false), `01` (true) */,
    CN_UINT8 = 1 /** CN_UINT8: `00` (0) until `ff` (255) */,
    CN_UINT16 = 2 /** CN_UINT16: `3412` = 1234 */,
    CN_UINT32 = 3 /** CN_UINT32: `7856 3412` = 12345678 */,
    CN_INT8 = 5 /** CN_INT8 */,
    CN_INT16 = 6 /** CN_INT16: `3412` = 1234 */,
    CN_INT32 = 7 /** CN_INT16: `3412` = 1234 */,
    CN_INT64 = 8 /** CN_INT64 */,
    CN_STRING = 9 /** CN_STRING */,
    CN_TIME = 10 /** CN_TIME */,
    CN_VERSION = 11 /** CN_VERSION */,
}

// Define the parsers for each property data type.
const PropertyDataTypeParsers = {
    [PropertyDataType.CN_BOOL]: (data: Buffer) => data.readUInt8() === 1,
    [PropertyDataType.CN_UINT8]: (data: Buffer) => data.readUInt8(),
    [PropertyDataType.CN_UINT16]: (data: Buffer) => data.readUInt16LE(),
    [PropertyDataType.CN_UINT32]: (data: Buffer) => data.readUInt32LE(),
    [PropertyDataType.CN_INT8]: (data: Buffer) => data.readInt8(),
    [PropertyDataType.CN_INT16]: (data: Buffer) => data.readInt16LE(),
    [PropertyDataType.CN_INT32]: (data: Buffer) => data.readInt32LE(),
    [PropertyDataType.CN_INT64]: (data: Buffer) => data.readBigInt64LE(),
    [PropertyDataType.CN_STRING]: (data: Buffer) => data.toString('utf8'),
    [PropertyDataType.CN_TIME]: (data: Buffer) => data.readUInt32LE(),
    [PropertyDataType.CN_VERSION]: (data: Buffer) => data.toString('utf8'),
} as const;

const PropertyDataTypeSerializers = {
    [PropertyDataType.CN_BOOL]: (data: boolean) => Buffer.from([data ? 1 : 0]),
    [PropertyDataType.CN_UINT8]: (data: number) => Buffer.from([data]),
    [PropertyDataType.CN_UINT16]: (data: number) => Buffer.from([data & 0xff, (data >> 8) & 0xff]),
    [PropertyDataType.CN_UINT32]: (data: number) =>
        Buffer.from([data & 0xff, (data >> 8) & 0xff, (data >> 16) & 0xff, (data >> 24) & 0xff]),
    [PropertyDataType.CN_INT8]: (data: number) => Buffer.from([data]),
    [PropertyDataType.CN_INT16]: (data: number) => Buffer.from([data & 0xff, (data >> 8) & 0xff]),
    [PropertyDataType.CN_INT32]: (data: number) =>
        Buffer.from([data & 0xff, (data >> 8) & 0xff, (data >> 16) & 0xff, (data >> 24) & 0xff]),
    [PropertyDataType.CN_INT64]: (data: bigint) => {
        const buf = Buffer.alloc(8, 0);
        buf.writeBigInt64LE(data);
        return buf;
    },
    [PropertyDataType.CN_STRING]: (data: string) => Buffer.from(data, 'utf8'),
    [PropertyDataType.CN_TIME]: (data: number) =>
        Buffer.from([data & 0xff, (data >> 8) & 0xff, (data >> 16) & 0xff, (data >> 24) & 0xff]),
    [PropertyDataType.CN_VERSION]: (data: string) => Buffer.from(data, 'utf8'),
} as const;

export interface DeviceProperty {
    readonly propertyId: number;
    readonly dataType: PropertyDataType;
    readonly convert?: (v: DeriveNativeDataType<this['dataType']>) => DeriveNativeDataType<this['dataType']>;
}

// Generic type for the property data from the parsers
type DeriveNativeDataType<T extends PropertyDataType> = (typeof PropertyDataTypeParsers)[T] extends (
    data: Buffer,
) => infer R
    ? R
    : never;
export type PropertyNativeType<T extends { dataType: PropertyDataType }> = DeriveNativeDataType<T['dataType']>;
export type ComfoAirPropertyType<P extends keyof typeof ComfoAirProperties> = PropertyNativeType<
    (typeof ComfoAirProperties)[P]
>;

/**
 * Object representing different properties with their propertyId and dataType.
 */
export const ComfoAirProperties = {
    /** Away indicator (`01` = low, medium, high fan speed, `07` = away) */
    AWAY_INDICATOR: { propertyId: 16, dataType: PropertyDataType.CN_UINT8 },
    /** Operating mode (`01` = limited manual, `05` = unlimited manual, `ff` = auto) */
    OPERATING_MODE_49: { propertyId: 49, dataType: PropertyDataType.CN_UINT8 },
    /** Operating mode (`01` = unlimited manual, `ff` = auto) */
    OPERATING_MODE_56: { propertyId: 56, dataType: PropertyDataType.CN_UINT8 },
    /** Fans: Fan speed setting (`00` (away), `01`, `02` or `03`) */
    FAN_SPEED_SETTING: { propertyId: 65, dataType: PropertyDataType.CN_UINT8 },
    /** Bypass activation mode (`00` = auto, `01` = activated, `02` = deactivated) */
    BYPASS_ACTIVATION_MODE: { propertyId: 66, dataType: PropertyDataType.CN_UINT8 },
    /** Temperature Profile (`00` = normal, `01` = cold, `02` = warm) */
    TEMPERATURE_PROFILE: { propertyId: 67, dataType: PropertyDataType.CN_UINT8 },
    /** General: Countdown until next fan speed change (`52020000` = 00000252 -> 594 seconds) */
    COUNTDOWN_NEXT_FAN_SPEED_CHANGE: { propertyId: 81, dataType: PropertyDataType.CN_UINT32 },
    /** Fans: Exhaust fan duty (`1c` = 28%) */
    EXHAUST_FAN_DUTY: { propertyId: 117, dataType: PropertyDataType.CN_UINT8 },
    /** Fans: Supply fan duty (`1d` = 29%) */
    SUPPLY_FAN_DUTY: { propertyId: 118, dataType: PropertyDataType.CN_UINT8 },
    /** Fans: Exhaust fan flow (`6e00` = 110 m³/h) */
    EXHAUST_FAN_FLOW: { propertyId: 119, dataType: PropertyDataType.CN_UINT16 },
    /** Fans: Supply fan flow (`6900` = 105 m³/h) */
    SUPPLY_FAN_FLOW: { propertyId: 120, dataType: PropertyDataType.CN_UINT16 },
    /** Fans: Exhaust fan speed (`2d04` = 1069 rpm) */
    EXHAUST_FAN_SPEED: { propertyId: 121, dataType: PropertyDataType.CN_UINT16 },
    /** Fans: Supply fan speed (`5904` = 1113 rpm) */
    SUPPLY_FAN_SPEED: { propertyId: 122, dataType: PropertyDataType.CN_UINT16 },
    /** Power Consumption: Current Ventilation (`0f00` = 15 W) */
    CURRENT_VENTILATION_POWER_CONSUMPTION: { propertyId: 128, dataType: PropertyDataType.CN_UINT16 },
    /** Power Consumption: Total year-to-date (`1700` = 23 kWh) */
    TOTAL_YEAR_TO_DATE_POWER_CONSUMPTION: { propertyId: 129, dataType: PropertyDataType.CN_UINT16 },
    /** Power Consumption: Total from start (`1700` = 23 kWh) */
    TOTAL_FROM_START_POWER_CONSUMPTION: { propertyId: 130, dataType: PropertyDataType.CN_UINT16 },
    /** Preheater Power Consumption: Total year-to-date (`1700` = 23 kWh) */
    PREHEATER_TOTAL_YEAR_TO_DATE_POWER_CONSUMPTION: { propertyId: 144, dataType: PropertyDataType.CN_UINT16 },
    /** Preheater Power Consumption: Total from start (`1700` = 23 kWh) */
    PREHEATER_TOTAL_FROM_START_POWER_CONSUMPTION: { propertyId: 145, dataType: PropertyDataType.CN_UINT16 },
    /** Preheater Power Consumption: Current Ventilation (`0f00` = 15 W) */
    PREHEATER_CURRENT_VENTILATION_POWER_CONSUMPTION: { propertyId: 146, dataType: PropertyDataType.CN_UINT16 },
    /** Days left before filters must be replaced (`8200` = 130 days) */
    DAYS_LEFT_BEFORE_FILTER_REPLACEMENT: { propertyId: 192, dataType: PropertyDataType.CN_UINT16, convert: v => v / 100 },
    /** Current RMOT (`7500` = 117 -> 11.7 °C) */
    CURRENT_RMOT: { propertyId: 209, dataType: PropertyDataType.CN_INT16, convert: v => v / 100 },
    /** Temperature profile target (`ee00` = 23.8 °C) */
    TEMPERATURE_PROFILE_TARGET: { propertyId: 212, dataType: PropertyDataType.CN_UINT16, convert: v => v / 100 },
    /** Avoided Heating: Avoided actual: (`b901` = 441 -> 4.41 W) */
    AVOIDED_HEATING_ACTUAL: { propertyId: 213, dataType: PropertyDataType.CN_UINT16, convert: v => v / 100 },
    /** Avoided Heating: Avoided year-to-date: (`dd01` = 477 kWh) */
    AVOIDED_HEATING_YEAR_TO_DATE: { propertyId: 214, dataType: PropertyDataType.CN_UINT16 },
    /** Avoided Heating: Avoided total: (`dd01` = 477 kWh) */
    AVOIDED_HEATING_TOTAL: { propertyId: 215, dataType: PropertyDataType.CN_UINT16 },
    /** Avoided Cooling: Avoided actual: (`b901` = 441 -> 4.41 W) */
    AVOIDED_COOLING_ACTUAL: { propertyId: 216, dataType: PropertyDataType.CN_UINT16, convert: v => v / 100 },
    /** Avoided Cooling: Avoided year-to-date: (`dd01` = 477 kWh) */
    AVOIDED_COOLING_YEAR_TO_DATE: { propertyId: 217, dataType: PropertyDataType.CN_UINT16 },
    /** Avoided Cooling: Avoided total: (`dd01` = 477 kWh) */
    AVOIDED_COOLING_TOTAL: { propertyId: 218, dataType: PropertyDataType.CN_UINT16 },
    /** Temperature & Humidity: Supply Air (`aa00` = 170 -> 17.0 °C) PostHeaterTempAfter */
    SUPPLY_AIR_TEMPERATURE: { propertyId: 221, dataType: PropertyDataType.CN_INT16, convert: v => v / 100 },
    /** Bypass state (`64` = 100%) */
    BYPASS_STATE: { propertyId: 227, dataType: PropertyDataType.CN_UINT8 },
    /** Temperature & Humidity: Extract Air (`ab00` = 171 -> 17.1 °C) */
    EXTRACT_AIR_TEMPERATURE: { propertyId: 274, dataType: PropertyDataType.CN_INT16, convert: v => v / 100 },
    /** Temperature & Humidity: Exhaust Air (`5600` = 86 -> 8.6 °C) */
    EXHAUST_AIR_TEMPERATURE: { propertyId: 275, dataType: PropertyDataType.CN_INT16, convert: v => v / 100 },
    /** Temperature & Humidity: Outdoor Air (`3c00` = 60 -> 6.0 °C) */
    OUTDOOR_AIR_TEMPERATURE: { propertyId: 276, dataType: PropertyDataType.CN_INT16, convert: v => v / 100 },
    /** Temperature & Humidity: Preheated Outdoor Air (`3c00` = 60 -> 6.0 °C) */
    PREHEATED_OUTDOOR_AIR_TEMPERATURE: { propertyId: 277, dataType: PropertyDataType.CN_INT16, convert: v => v / 100 },
    /** PostHeaterTempBefore */
    POST_HEATER_TEMP_BEFORE: { propertyId: 278, dataType: PropertyDataType.CN_INT16, convert: v => v / 100 },
    /** Temperature & Humidity: Extract Air (`31` = 49%) */
    EXTRACT_AIR_HUMIDITY: { propertyId: 290, dataType: PropertyDataType.CN_UINT8 },
    /** Temperature & Humidity: Exhaust Air (`57` = 87%) */
    EXHAUST_AIR_HUMIDITY: { propertyId: 291, dataType: PropertyDataType.CN_UINT8 },
    /** Temperature & Humidity: Outdoor Air (`43` = 67%) */
    OUTDOOR_AIR_HUMIDITY: { propertyId: 292, dataType: PropertyDataType.CN_UINT8 },
    /** Temperature & Humidity: Preheated Outdoor Air (`43` = 67%) */
    PREHEATED_OUTDOOR_AIR_HUMIDITY: { propertyId: 293, dataType: PropertyDataType.CN_UINT8 },
    /** Temperature & Humidity: Supply Air (`23` = 35%) */
    SUPPLY_AIR_HUMIDITY: { propertyId: 294, dataType: PropertyDataType.CN_UINT8 },
    ANALOG_VOLTAGE_1: { propertyId: 513, dataType: PropertyDataType.CN_UINT16, convert: v => (v / 4100).toFixed(1) },
    ANALOG_VOLTAGE_2: { propertyId: 514, dataType: PropertyDataType.CN_UINT16, convert: v => (v / 4160).toFixed(1) },
    ANALOG_VOLTAGE_3: { propertyId: 515, dataType: PropertyDataType.CN_UINT16, convert: v => (v / 4160).toFixed(1) },
    ANALOG_VOLTAGE_4: { propertyId: 516, dataType: PropertyDataType.CN_UINT16, convert: v => (v / 4160).toFixed(1) }, 
    /** ComfoCoolCompressor State */
    COMFOCOOL_COMPRESSOR_STATE: { propertyId: 785, dataType: PropertyDataType.CN_BOOL },
} as const;

/**
 * Get the value of a property from the data buffer.
 * @param property The property to get the value for.
 * @param data The data buffer to read the value from.
 * @returns The value of the property.
 */
export function deserializePropertyValue<T extends { dataType: PropertyDataType }>(
    property: T,
    data: Buffer,
): PropertyNativeType<T>;
export function deserializePropertyValue<T extends PropertyDataType>(
    dataType: T,
    data: Buffer,
): DeriveNativeDataType<T>;
export function deserializePropertyValue(type: PropertyDataType | { dataType?: PropertyDataType }, data: Buffer) {
    if (typeof type === 'object') {
        if (type.dataType === undefined) {
            return data;
        }
        return PropertyDataTypeParsers[type.dataType](data);
    }
    return PropertyDataTypeParsers[type](data);
}

/**
 * Get the value of a property from the data buffer.
 * @param property The property to get the value for.
 * @param data The data buffer to read the value from.
 * @returns The value of the property.
 */
export function serializePropertyValue<T extends { dataType: PropertyDataType }>(
    property: T,
    value: PropertyNativeType<T>,
): Buffer;
export function serializePropertyValue<T extends PropertyDataType>(dataType: T, value: DeriveNativeDataType<T>): Buffer;
export function serializePropertyValue(type: PropertyDataType | { dataType: PropertyDataType }, value: never) {
    if (typeof type === 'object') {
        return PropertyDataTypeSerializers[type.dataType](value);
    }
    return PropertyDataTypeSerializers[type](value);
}

/**
 * Get the property object by its propertyId.
 * @param id The propertyId to get the property for.
 * @returns The property object.
 */
export function getProperty(id: number): DeviceProperty | undefined {
    return Object.values(ComfoAirProperties).find(
        (prop) => typeof prop === 'object' && prop.propertyId === id,
    ) as DeviceProperty;
}

/**
 * Get the property name by its propertyId.
 * @param id The propertyId to get the name for.
 * @returns The property name.
 */
export function getPropertyName(id: number): string | undefined {
    return Object.entries(ComfoAirProperties).find(
        ([, prop]) => typeof prop === 'object' && prop.propertyId === id,
    )?.[0];
}
