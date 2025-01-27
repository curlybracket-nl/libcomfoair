/**
 * Creates a promise that resolves after a given number of milliseconds.
 * @param ms The number of milliseconds to wait before resolving the promise.
 * @returns A promise that resolves after the given number of milliseconds.
 */
export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Utility function to add a timeout to a promise, the promise will be rejected with an error if it does not resolve within the given time.
 * @param promise The promise to add a timeout to.
 * @param ms The number of milliseconds to wait before rejecting the promise.
 * @param errorMessage The error message to use when the promise times out.
 * @returns A promise that resolves when the given promise resolves or rejects when the given promise rejects or times out.
 */
export function timeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((_, reject) => timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), ms));
    const awaitedPromise = promise.then((value) => {
        clearTimeout(timeoutHandle);
        return value;
    }).catch((error) => {
        clearTimeout(timeoutHandle);
        throw error;
    });
    return Promise.race([ timeoutPromise, awaitedPromise ]);
}