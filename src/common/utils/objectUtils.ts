/**
 * Gets the value at a dot-separated path of an object.
 */
export function getByPath(obj: any, path: string | string[], defaultValue?: any): any {
  if (obj == null) return defaultValue;

  const keys = Array.isArray(path) ? path : path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let result = obj;

  for (const key of keys) {
    if (result == null) return defaultValue;
    result = result[key];
  }

  return result === undefined ? defaultValue : result;
}

/**
 * Sets the value at a dot-separated path of an object, creating intermediate
 * objects or arrays as needed. Mutates and returns the object.
 */
export function setByPath(obj: any, path: string | string[], value: any): any {
  if (obj == null) return obj;

  const keys = Array.isArray(path) ? path : path.replace(/\[(\d+)\]/g, '.$1').split('.');

  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];

    if (current[key] == null) {
      // Create an array if the next key is a numeric index, otherwise an object
      current[key] = /^\d+$/.test(nextKey) ? [] : {};
    }

    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return obj;
}
