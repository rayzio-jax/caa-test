/** Use to parse value into JSON object */
export function parseStringify(value: any) {
    return JSON.parse(JSON.stringify(value));
}
