
import { describe, it, expect } from 'vitest';
import { PropertyDataType, getPropertyValue } from '../deviceProperties';

describe('PropertyDataTypeParsers', () => {
  it('CN_BOOL should parse 0/1 correctly', () => {
    const bufFalse = Buffer.from([0x00]);
    const bufTrue = Buffer.from([0x01]);
    expect(getPropertyValue({ propertyId: 0, dataType: PropertyDataType.CN_BOOL }, bufFalse)).toBe(false);
    expect(getPropertyValue({ propertyId: 0, dataType: PropertyDataType.CN_BOOL }, bufTrue)).toBe(true);
  });

  it('CN_UINT8 should parse unsigned byte correctly', () => {
    const buf = Buffer.from([0xff]);
    expect(getPropertyValue({ propertyId: 0, dataType: PropertyDataType.CN_UINT8 }, buf)).toBe(255);
  });

  it('CN_UINT16 should parse unsigned 16-bit correctly', () => {
    const buf = Buffer.from([0x34, 0x12]);
    expect(getPropertyValue({ propertyId: 0, dataType: PropertyDataType.CN_UINT16 }, buf)).toBe(4660);
  });

  it('CN_UINT32 should parse unsigned 32-bit correctly', () => {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    expect(getPropertyValue({ propertyId: 0, dataType: PropertyDataType.CN_UINT32 }, buf)).toBe(305419896);
  });

  it('CN_INT8 should parse signed byte correctly', () => {
    const buf = Buffer.from([0xff]); // -1 in signed 8-bit
    expect(getPropertyValue({ propertyId: 0, dataType: PropertyDataType.CN_INT8 }, buf)).toBe(-1);
  });

  it('CN_INT16 should parse signed 16-bit correctly', () => {
    const buf = Buffer.from([0x34, 0x12]); // 4660 in decimal
    expect(getPropertyValue({ propertyId: 0, dataType: PropertyDataType.CN_INT16 }, buf)).toBe(4660);
  });

  it('CN_INT32 should parse signed 32-bit correctly', () => {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]); // 305419896
    expect(getPropertyValue({ propertyId: 0, dataType: PropertyDataType.CN_INT32 }, buf)).toBe(305419896);
  });

  it('CN_INT64 should parse signed 64-bit correctly', () => {
    const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]); // 1n
    expect(getPropertyValue({ propertyId: 0, dataType: PropertyDataType.CN_INT64 }, buf)).toBe(1n);
  });

  it('CN_STRING should parse string correctly', () => {
    const buf = Buffer.from('Hello');
    expect(getPropertyValue({ propertyId: 0, dataType: PropertyDataType.CN_STRING }, buf)).toBe('Hello');
  });

  it('CN_TIME should parse time as unsigned 32-bit correctly', () => {
    const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
    expect(getPropertyValue({ propertyId: 0, dataType: PropertyDataType.CN_TIME }, buf)).toBe(305419896);
  });

  it('CN_VERSION should parse version string', () => {
    const buf = Buffer.from('1.2.3');
    expect(getPropertyValue({ propertyId: 0, dataType: PropertyDataType.CN_VERSION }, buf)).toBe('1.2.3');
  });
});