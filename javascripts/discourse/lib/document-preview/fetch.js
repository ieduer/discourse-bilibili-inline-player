import { isTrustedUrl } from "./policy.js";

export class DocumentPreviewError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "DocumentPreviewError";
    this.code = code;
  }
}

function isAbortError(error) {
  return error?.name === "AbortError" || error?.code === "ABORTED";
}

/**
 * Downloads one attachment into memory for local rendering.
 *
 * The request goes only to a trusted origin and carries the forum session
 * only when that origin is the forum itself (credentials: "same-origin").
 * Redirects are followed by the browser, then the final URL must also be
 * trusted before any of the body is read. The body is read as a stream and
 * abandoned as soon as it passes the size limit.
 */
export async function fetchDocumentBytes(
  url,
  { maxBytes, trustedOrigins, signal, fetchImpl = globalThis.fetch }
) {
  if (!isTrustedUrl(url, trustedOrigins)) {
    throw new DocumentPreviewError("UNTRUSTED_ORIGIN");
  }

  let response;

  try {
    response = await fetchImpl(url, {
      credentials: "same-origin",
      redirect: "follow",
      referrerPolicy: "same-origin",
      cache: "default",
      signal,
    });
  } catch (error) {
    throw new DocumentPreviewError(isAbortError(error) ? "ABORTED" : "NETWORK");
  }

  const finalUrl = response.url || url;

  if (!isTrustedUrl(finalUrl, trustedOrigins)) {
    await response.body?.cancel?.().catch?.(() => {});
    throw new DocumentPreviewError("UNTRUSTED_REDIRECT");
  }

  if (!response.ok) {
    await response.body?.cancel?.().catch?.(() => {});
    throw new DocumentPreviewError("HTTP", `HTTP ${response.status}`);
  }

  const contentType = String(response.headers?.get?.("content-type") || "").toLowerCase();

  // A login wall or error page arrives as HTML with status 200 on some setups.
  if (/^(?:text\/html|application\/xhtml\+xml|application\/json)/u.test(contentType)) {
    await response.body?.cancel?.().catch?.(() => {});
    throw new DocumentPreviewError("NOT_A_FILE");
  }

  const declared = Number.parseInt(response.headers?.get?.("content-length") || "", 10);

  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel?.().catch?.(() => {});
    throw new DocumentPreviewError("TOO_LARGE");
  }

  try {
    if (!response.body?.getReader) {
      const buffer = await response.arrayBuffer();

      if (buffer.byteLength > maxBytes) {
        throw new DocumentPreviewError("TOO_LARGE");
      }

      return buffer;
    }

    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;

    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      received += value.byteLength;

      if (received > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new DocumentPreviewError("TOO_LARGE");
      }

      chunks.push(value);
    }

    const bytes = new Uint8Array(received);
    let offset = 0;

    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return bytes.buffer;
  } catch (error) {
    if (error instanceof DocumentPreviewError) {
      throw error;
    }

    throw new DocumentPreviewError(isAbortError(error) || signal?.aborted ? "ABORTED" : "NETWORK");
  }
}
