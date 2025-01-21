import { describe, it, expect } from 'vitest';
import { COMFO_MESSAGE_HEADER_LENGTH, ComfoControlHeader } from '../comfoControlHeader.js';

describe('ComfoControlHeader', () => {
    it('should construct correctly', () => {
        const header = new ComfoControlHeader('1', '2', 10, 20);
        expect(header.senderUuid).toBe('00000000000000000000000000000001');
        expect(header.receiverUuid).toBe('00000000000000000000000000000002');
        expect(header.opLength).toBe(10);
        expect(header.messageLength).toBe(20);
    });

    it('should parse from binary', () => {
        const buffer = Buffer.alloc(38);
        buffer.writeUInt32BE(38 + 4 + 8 - 4, 0);
        buffer.write('00000000000073656e64657255756964', 4, 16, 'hex');
        buffer.write('00000000726563656976657255756964', 20, 16, 'hex');
        buffer.writeUInt16BE(4, 36);
        const header = ComfoControlHeader.fromBinary(buffer);
        expect(header).toBeInstanceOf(ComfoControlHeader);
        expect(header.senderUuid).toBe('00000000000073656e64657255756964');
        expect(header.receiverUuid).toBe('00000000726563656976657255756964');
        expect(header.opLength).toBe(4);
        expect(header.messageLength).toBe(8);
    });

    it('should convert to binary', () => {
        const header = new ComfoControlHeader('73656e64657255756964', '726563656976657255756964', 10, 24);
        const buffer = header.toBinary();
        expect(buffer.length).toBe(38);
        expect(buffer.readUInt32BE(0)).toBe(38 + 10 + 24 - 4);
        expect(buffer.toString('hex', 4, 20)).toBe('00000000000073656e64657255756964');
        expect(buffer.toString('hex', 20, 36)).toBe('00000000726563656976657255756964');
        expect(buffer.readUInt16BE(36)).toBe(10);
    });

    it('should get operation buffer correctly', () => {
        const header = new ComfoControlHeader('sender', 'receiver', 5, 10);
        const data = Buffer.alloc(50);
        const opBuf = header.getOperationBuffer(data);
        expect(opBuf.length).toBe(5);
    });

    it('should get message buffer correctly', () => {
        const header = new ComfoControlHeader('sender', 'receiver', 4, 10);
        const data = Buffer.alloc(header.length);
        const msgBuf = header.getMessageBuffer(data);
        expect(msgBuf.length).toBe(10);
    });

    it('should parse operation', () => {
        const header = new ComfoControlHeader('sender', 'receiver', 4, 10);
        const data = Buffer.concat([Buffer.alloc(COMFO_MESSAGE_HEADER_LENGTH).fill(0), Buffer.from('08022002', 'hex')]);
        expect(() => header.parseOperation(data)).not.toThrow();
    });

    it('should report length, messageOffset, opOffset', () => {
        const header = new ComfoControlHeader('sender', 'receiver', 5, 10);
        expect(header.length).toBe(COMFO_MESSAGE_HEADER_LENGTH + 5 + 10);
        expect(header.messageOffset).toBe(COMFO_MESSAGE_HEADER_LENGTH + 5);
        expect(header.opOffset).toBe(COMFO_MESSAGE_HEADER_LENGTH);
    });
});
