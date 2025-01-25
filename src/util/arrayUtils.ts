export function removeArrayElement<T extends Array<unknown>>(array: T, element: T extends Array<infer U> ? U : never): T {
    const index = array.indexOf(element);
    if (index !== -1) {
        array.splice(index, 1);
    }
    return array;
}