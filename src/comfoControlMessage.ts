import { GatewayOperation, Opcode, Result } from './protocol/comfoConnect.js';
import { opcodes } from './opcodes.js';
import { ComfoControlHeader } from './comfoControlHeader.js';
import { BinaryReadOptions } from '@protobuf-ts/runtime';

/**
 * Describes the header of the ComfoAir messages, each message starts with this header.
 * The header is always 38 bytes long.
 */
export class ComfoControlMessage<T extends keyof typeof opcodes = Opcode.NO_OPERATION> {
    public get opcode() {
        return this.operation.opcode;
    }

    public get opcodeName() {
        return Opcode[this.operation.opcode];
    }

    public get id() {
        return this.operation.id;
    }

    public get resultCode() {
        return this.operation.result ?? Result.OK;
    }

    public get resultName() {
        return Result[this.resultCode];
    }

    public constructor(
        private operation: GatewayOperation,
        private message: Uint8Array,
    ) {}

    public static fromJson<D extends keyof typeof opcodes>(operation: GatewayOperation & { opcode: D }, message?: ReturnType<(typeof opcodes)[D]['create']>): ComfoControlMessage {
        return new ComfoControlMessage(
            operation, 
            // eslint-disable-next-line
            Buffer.from(opcodes[operation.opcode].toBinary((message ?? {}) as any))
        );
    }

    public static fromBinary(data: Buffer): Array<ComfoControlMessage> {
        const messages: ComfoControlMessage[] = [];
        for (let offset = 0; offset < data.length; ) {
            const header = ComfoControlHeader.fromBinary(data, offset);
            const operation = GatewayOperation.fromBinary(header.getOperationBuffer(data, offset));
            const message = header.getMessageBuffer(data, offset);
            messages.push(new ComfoControlMessage(operation, message));
            offset += header.length;
        }
        return messages;
    }

    public toString() {
        return `${this.opcodeName} (${this.id}) - ${this.resultName} (${this.resultCode})`;
    }

    public deserialize<D extends keyof typeof opcodes = T>(
        options?: Partial<BinaryReadOptions>,
    ): ReturnType<(typeof opcodes)[D]['create']> {
        if (!opcodes[this.opcode]) {
            throw new Error(`Unsupported opcode: ${Opcode[this.opcode]}`);
        }
        return opcodes[this.opcode].fromBinary(this.message, options) as ReturnType<(typeof opcodes)[D]['create']>;
    }

    /**
     * Returns the message as a untyped JSON object.
     * @returns The message as a JSON object.
     */
    public toJson(): object {
        return this.deserialize({ readUnknownField: true });
    }
}
