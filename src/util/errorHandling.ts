/**
 * Executes a function and returns its result. If an error occurs, returns the fallback value.
 *
 * @template T - The type of the return value.
 * @param {() => T} fn - The function to execute.
 * @param {T} fallback - The value to return if an error occurs.
 * @returns {T} - The result of the function or the fallback value if an error occurs.
 */
export function tryCatch<T>(fn: () => T, fallback: T): T {
    try {
        return fn();
    } catch {
        return fallback;
    }
}
