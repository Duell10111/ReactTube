/**
 * Converts an arbitrary thrown value into displayable text. Flash messages
 * render their description as a React child, so passing an `Error` object
 * there crashes the render.
 */
export function describeError(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return value.message || value.name;
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      // Fall through for circular structures.
    }
  }
  return String(value);
}
