/**
 * Enum for log levels.
 */
export enum LogLevel {
    NONE = 0,
    INFO = 1 << 0,
    VERBOSE = 1 << 1,
    DEBUG = 1 << 2,
    WARNING = 1 << 3,
    ERROR = 1 << 4,
    DEFAULT = INFO | WARNING | ERROR,
    ALL = INFO | VERBOSE | DEBUG | WARNING | ERROR
}
