/**
 * This is the only method in the package. Given the file path it returns an Object containing the mmCIF
 * file informations.
 * @param {String} str - file contents
 */
declare function getObject(str: string): Record<string, unknown>;
export { getObject };
