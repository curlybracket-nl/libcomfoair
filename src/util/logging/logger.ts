import { LogLevel } from './logLevel';
import { DebugPrinter, ILogPrinter } from './logPrinter';

/**
 * Logger class for managing log messages.
 * Supports hierarchical loggers and multiple log printers.
 */
export class Logger {
    private readonly printers: ILogPrinter[] = [];
    private readonly children: Logger[] = [];
    private severity: LogLevel;

    /*
     * The root appliction logger.
     */
    private static root: Logger = new Logger('comfo-connect', LogLevel.DEFAULT, undefined);

    /**
     * Get the root logger in the hierarchy.
     * @returns The root logger.
     */
    public static getRoot(): Logger {
        return Logger.root;
    }

    /**
     * Create a new logger instance.
     * @param name Name of the logger
     * @param severity Severity of messages to write
     * @returns 
     */
    public static create(name: string, severity: LogLevel = LogLevel.DEFAULT): Logger {
        return new Logger(name, severity);
    }

    /**
     * Initialize the root logger with the given configuration. Can only be called once per session.
     * @example
     * ```typescript
     * Logger.start({
     *    name: 'comfo-connect',
     *    level: LogLevel.DEBUG,
     *    printers: [ new FilePrinter('./comfo.log'), ConsolePrinter() ]
     * });
     * @param options - The configuration options for the root logger.
     */
    public static start({
        /**
         * The name of the root logger.
         */
        name = 'comfo-connect',
        /**
         * The log level for the root logger.
         */
        level = LogLevel.DEFAULT,
        /**
         * The printers used to output log messages; defaults to a DebugPrinter.
         */
        printers = [new DebugPrinter()],
    }): void {
        const root = Logger.getRoot();
        for (const printer of printers) {
            root.addPrinter(printer);
        }
        if (level) {
            root.setLogLevel(level);
        }
        if (name) {
            root.setName(name);
        }
    }

    /**
     * Create a new Logger instance.
     * @param name - The name of the logger.
     * @param parent - The parent logger, if any.
     * @param severity - The severity level for the logger. Defaults to LogLevel.DEFAULT.
     */
    constructor(
        private name: string,
        severity?: LogLevel,
        private readonly parent: Logger = Logger.getRoot(),
    ) {
        if (parent) {
            parent.children.push(this);
        }
        this.severity = severity ?? parent?.severity ?? LogLevel.DEFAULT;
    }

    public setLogLevel(severity: LogLevel): Logger {
        this.severity = severity;
        return this;
    }

    public enableLogLevel(severity: LogLevel): Logger {
        this.severity |= severity;
        return this;
    }

    public disableLogLevel(severity: LogLevel): Logger {
        this.severity &= ~severity;
        return this;
    }

    public setName(name: string): Logger {
        this.name = name;
        return this;
    }

    /**
     * Add a printer to the logger.
     * @param printer - The printer to add.
     */
    public addPrinter(printer: ILogPrinter): Logger {
        this.printers.push(printer);
        return this;
    }

    /**
     * Create a child logger.
     * @param name - The name of the child logger.
     * @param severity - The severity level for the child logger. Defaults to the parent's severity level.
     * @returns The created child logger.
     */
    public createLogger(name: string, severity?: LogLevel): Logger {
        return new Logger(name, severity ?? this.severity, this);
    }

    /**
     * Log a message with a specific severity level.
     * @param level - The severity level of the log message.
     * @param message - The log message.
     * @param args - Additional arguments to log.
     */
    public log(level: LogLevel, message: string, ...args: unknown[]): void {
        if (!(this.severity & level)) {
            return;
        }
        this.printers.forEach((printer) => printer.printLine(level, this.name, message, ...args));
        if (this.parent) {
            this.parent.log(level, message, ...args);
        }
    }

    /**
     * Log an info message.
     * @param message - The log message.
     * @param args - Additional arguments to log.
     */
    public info(message: string, ...args: unknown[]): void {
        this.log(LogLevel.INFO, message, ...args);
    }

    /**
     * Log a verbose message.
     * @param message - The log message.
     * @param args - Additional arguments to log.
     */
    public verbose(message: string, ...args: unknown[]): void {
        this.log(LogLevel.VERBOSE, message, ...args);
    }

    /**
     * Log a debug message.
     * @param message - The log message.
     * @param args - Additional arguments to log.
     */
    public debug(message: string, ...args: unknown[]): void {
        this.log(LogLevel.DEBUG, message, ...args);
    }

    /**
     * Log a warning message.
     * @param message - The log message.
     * @param args - Additional arguments to log.
     */
    public warn(message: string, ...args: unknown[]): void {
        this.log(LogLevel.WARNING, message, ...args);
    }

    /**
     * Log an error message.
     * @param message - The log message.
     * @param args - Additional arguments to log.
     */
    public error(message: string, ...args: unknown[]): void {
        this.log(LogLevel.ERROR, message, ...args);
    }
}
