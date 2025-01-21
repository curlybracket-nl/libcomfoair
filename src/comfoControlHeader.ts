import { GatewayOperation } from './protocol/comfoConnect.js';

/**
 * All ComfoAir messages start with a 38 byte header.
 */
export const COMFO_MESSAGE_HEADER_LENGTH = 38;

export class ComfoControlHeader {
    /**
     * The total length of the message, excluding the totalLength field (4 bytes).
     */
    public readonly messageLength: number;

    /**
     * The UUID of the sender device.
     */
    public readonly senderUuid: string;

    /**
     * The UUID of the receiver device.
     */
    public readonly receiverUuid: string;

    /**
     * The length of the operation data.
     */
    public readonly opLength: number;

    /**
     * The total length of the message including msg and op data.
     */
    public get length() {
        return COMFO_MESSAGE_HEADER_LENGTH + this.opLength + this.messageLength;
    }

    public get messageOffset() {
        return this.opLength + COMFO_MESSAGE_HEADER_LENGTH;
    }

    public get opOffset() {
        return COMFO_MESSAGE_HEADER_LENGTH;
    }

    constructor(senderUuid: string, receiverUuid: string, opLength: number, messageLength: number) {
        this.senderUuid = senderUuid.padStart(32, '0');
        this.receiverUuid = receiverUuid.padStart(32, '0');
        this.opLength = opLength;
        this.messageLength = messageLength;
    }

    public static fromBinary(data: Buffer, offset: number = 0): ComfoControlHeader {
        if (data.length - offset < COMFO_MESSAGE_HEADER_LENGTH) {
            throw new Error(
                `Not enough bytes in buffer to read header; expected 38 bytes but got ${data.length - offset}`,
            );
        }
        const totalLength = data.readUInt32BE(0 + offset) + 4;
        const senderUuid = data.toString('hex', 4 + offset, 20 + offset);
        const receiverUuid = data.toString('hex', 20 + offset, 36 + offset);
        const opLength = data.readUInt16BE(36 + offset);
        const messageLength = totalLength - COMFO_MESSAGE_HEADER_LENGTH - opLength;
        return new ComfoControlHeader(senderUuid, receiverUuid, opLength, messageLength);
    }

    public toBinary(): Buffer {
        const header = Buffer.alloc(COMFO_MESSAGE_HEADER_LENGTH);
        header.writeUInt32BE(this.length - 4, 0);
        header.write(this.senderUuid, 4, 16, 'hex');
        header.write(this.receiverUuid, 20, 16, 'hex');
        header.writeUInt16BE(this.opLength, 36);
        return header;
    }

    public getOperationBuffer(data: Buffer, offset: number = 0): Buffer {
        if (data.length - offset < this.opOffset + this.opLength) {
            throw new Error(
                `Not enough bytes in buffer to read operation; expected ${this.opLength} bytes but buffer has ${Math.max(data.length - (this.opOffset + offset), 0)} bytes left`,
            );
        }
        return data.subarray(this.opOffset + offset, this.opOffset + this.opLength + offset);
    }

    public getMessageBuffer(data: Buffer, offset: number = 0): Buffer {
        if (data.length - offset < this.messageOffset + this.messageLength) {
            throw new Error(
                `Not enough bytes in buffer to read message; expected ${this.messageLength} bytes but buffer has ${Math.max(data.length - (this.messageOffset + offset), 0)} bytes left`,
            );
        }
        return data.subarray(this.messageOffset + offset, this.messageOffset + this.messageLength + offset);
    }

    public parseOperation(data: Buffer, offset: number = 0): GatewayOperation {
        return GatewayOperation.fromBinary(this.getOperationBuffer(data, offset));
    }
}
