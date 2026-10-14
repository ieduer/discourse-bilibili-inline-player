// Error codes are a fixed vocabulary. The page maps each code to its own
// message; text taken from a document (part names, parser messages) is never
// shown to readers.
export const PREVIEW_ERROR_CODES = Object.freeze([
  "CORRUPT",
  "DTD_FORBIDDEN",
  "ENCRYPTED",
  "FORMAT_MISMATCH",
  "MACRO_ENABLED",
  "PARSE_FAILED",
  "TIMEOUT",
  "TOO_LARGE",
  "TOO_MANY_PARTS",
  "TOO_MANY_SLIDES",
  "UNSUPPORTED_ZIP",
]);

export class PreviewError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "PreviewError";
    this.code = PREVIEW_ERROR_CODES.includes(code) ? code : "PARSE_FAILED";
  }
}

export function createDeadline(timeoutMs, now = () => Date.now()) {
  const expiresAt = now() + timeoutMs;

  return () => {
    if (now() > expiresAt) {
      throw new PreviewError("TIMEOUT", "Preview parsing exceeded its time budget");
    }
  };
}
