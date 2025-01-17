import { LogLevel } from "./logLevel";
import * as fs from 'fs';

/**
 * Interface for log printers.
 */
export interface ILogPrinter {
    /**
     * Print a log message.
     * @param level - The severity level of the log message.
     * @param name - The name of the logger.
     * @param message - The log message.
     * @param args - Additional arguments to log.
     */
    printLine(level: LogLevel, name: string, message: string, ...args: unknown[]): void;
}

/**
 * Abstract base class for log printers.
 * Provides common functionality for formatting log messages.
 */
export abstract class BasePrinter implements ILogPrinter {
    /**
     * Print a log message.
     * @param level - The severity level of the log message.
     * @param name - The name of the logger.
     * @param message - The log message.
     * @param args - Additional arguments to log.
     */
    public printLine(level: LogLevel, name: string, message: string, ...args: unknown[]): void {
        const formattedMessage = this.formatMessage(message, ...args);
        this.output(level, name, formattedMessage);
    }

    /**
     * Output a formatted log message.
     * @param level - The severity level of the log message.
     * @param name - The name of the logger.
     * @param message - The formatted log message.
     */
    protected abstract output(level: LogLevel, name: string, message: string): void;

    /**
     * Format a log message.
     * @param level - The severity level of the log message.
     * @param name - The name of the logger.
     * @param message - The log message.
     * @param args - Additional arguments to log.
     * @returns The formatted log message.
     */
    protected formatMessage(message: string, ...args: unknown[]): string {
        const evaluatedArgs = args.map((arg) => {
            if (typeof arg === 'function') {
                arg = arg();
            }
            if (typeof arg === 'object' && arg !== null) {
                try {
                    return JSON.stringify(arg);
                } catch {
                    // Ignore parse errors, print original object
                }
            }
            return String(arg);
        });
        return `${message} ${evaluatedArgs.join(' ')}`;
    }
}

/**
 * Console printer for logging messages to the console.
 */
export class ConsolePrinter extends BasePrinter {
    /**
     * Output a formatted log message to the console.
     * @param level - The severity level of the log message.
     * @param name - The name of the logger.
     * @param message - The formatted log message.
     */
    protected output(level: LogLevel, name: string, message: string): void {
        const timestamp = `[${new Date().toISOString()}] `;
        console.log(`${timestamp}[${level}] [${name}] ${message}`);
    }
}

/**
 * File printer for logging messages to a file.
 */
export class FilePrinter extends BasePrinter {
    private logFilePath: string;
    private writeQueue: Promise<void> = Promise.resolve();
    private fileHandle?: fs.promises.FileHandle;
    private closeTimeout?: NodeJS.Timeout;

    constructor(logFilePath: string) {
        super();
        this.logFilePath = logFilePath;
    }

    /**
     * Ensure the log file directory exists.
     */
    private async ensureLogFileDirectory(): Promise<void> {
        await fs.promises.mkdir(
            this.logFilePath.substring(0, this.logFilePath.lastIndexOf('/')),
            { recursive: true }
        );
    }

    /**
     * Initialize the file handle for the log file.
     */
    private async getFileHandle(): Promise<fs.promises.FileHandle> {
        if (!this.fileHandle) {
            try {
                await this.ensureLogFileDirectory();
                const fileExists = await fs.promises.access(this.logFilePath).then(() => true).catch(() => false);
                this.fileHandle = await fs.promises.open(this.logFilePath, 'a');
                if (!fileExists) {
                    const header = this.createLogEntry('INFO', 'FilePrinter', '--- Logging session started ---');
                    await this.fileHandle.appendFile(header);
                }
                this.scheduleClose();
            } catch (err) {
                console.error('Failed to open log file:', err);
            }
        }
        return this.fileHandle;
    }

    /**
     * Create a log entry string.
     * @param level - The severity level of the log message.
     * @param name - The name of the logger.
     * @param message - The log message.
     * @returns The formatted log entry string.
     */
    private createLogEntry(level: LogLevel | string, name: string, message: string): string {
        const logEntry = {
            timestamp: Math.floor(Date.now() / 1000),
            level: level,
            name: name,
            message: message
        };
        return JSON.stringify(logEntry) + '\n';
    }

    /**
     * Close the file handle after a delay.
     */
    private scheduleClose(): void {
        if (this.closeTimeout) {
            clearTimeout(this.closeTimeout);
        }
        this.closeTimeout = setTimeout(async () => {
            if (this.fileHandle) {
                try {
                    await this.fileHandle.close();
                    this.fileHandle = null;
                } catch (err) {
                    console.error('Failed to close log file:', err);
                }
            }
        }, 5000);
    }

    /**
     * Output a formatted log message to a file asynchronously.
     * @param level - The severity level of the log message.
     * @param name - The name of the logger.
     * @param message - The formatted log message.
     */
    protected output(level: LogLevel, name: string, message: string): void {
        const logMessage = this.createLogEntry(level, name, message);

        this.writeQueue = this.writeQueue.then(async () => {
            const handle = await this.getFileHandle();
            if (handle) {
                try {
                    await handle.appendFile(logMessage);
                    this.scheduleClose();
                } catch (err) {
                    console.error('Failed to write log message:', err);
                }
            }
        });
    }
}