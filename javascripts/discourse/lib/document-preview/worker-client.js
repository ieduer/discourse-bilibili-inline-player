import { DocumentPreviewError } from "./fetch.js";

export const WORKER_PROTOCOL_VERSION = 1;

const WORKER_ERROR_CODES = new Set([
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

let nextRequestId = 1;

/**
 * Runs one parse request in a dedicated Web Worker and always terminates it.
 * Termination is the hard stop for the parse time limit and for cancellation:
 * a stuck parser cannot keep running after the reader closes the preview.
 */
export function runPreviewWorker({
  workerUrl,
  format,
  bytes,
  limits,
  timeoutMs,
  signal,
  WorkerImpl = globalThis.Worker,
}) {
  return new Promise((resolve, reject) => {
    if (!workerUrl || typeof WorkerImpl !== "function") {
      reject(new DocumentPreviewError("WORKER_UNAVAILABLE"));
      return;
    }

    if (signal?.aborted) {
      reject(new DocumentPreviewError("ABORTED"));
      return;
    }

    let worker;

    try {
      worker = new WorkerImpl(workerUrl, { name: "rich-embeds-office-preview" });
    } catch {
      reject(new DocumentPreviewError("WORKER_UNAVAILABLE"));
      return;
    }

    const id = nextRequestId++;
    let settled = false;
    let timer = null;

    const finish = (callback) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      callback();
    };

    const onAbort = () => finish(() => reject(new DocumentPreviewError("ABORTED")));

    timer = setTimeout(
      () => finish(() => reject(new DocumentPreviewError("TIMEOUT"))),
      timeoutMs
    );
    signal?.addEventListener?.("abort", onAbort, { once: true });

    worker.onerror = (event) => {
      event?.preventDefault?.();
      finish(() => reject(new DocumentPreviewError("WORKER_UNAVAILABLE")));
    };

    worker.onmessage = (event) => {
      const message = event?.data;

      if (!message || message.id !== id) {
        return;
      }

      if (message.ok) {
        finish(() => resolve(message.result));
      } else {
        const code = WORKER_ERROR_CODES.has(message.error?.code) ? message.error.code : "PARSE_FAILED";
        finish(() => reject(new DocumentPreviewError(code)));
      }
    };

    try {
      worker.postMessage(
        { protocol: WORKER_PROTOCOL_VERSION, id, format, bytes, limits: { ...limits, timeoutMs } },
        [bytes]
      );
    } catch {
      finish(() => reject(new DocumentPreviewError("WORKER_UNAVAILABLE")));
    }
  });
}

/** Limits how many previews parse at once; extra requests wait their turn. */
export function createPreviewScheduler(maxConcurrent) {
  let active = 0;
  const queue = [];

  const pump = () => {
    while (active < maxConcurrent && queue.length > 0) {
      const entry = queue.shift();

      if (entry.signal?.aborted) {
        entry.reject(new DocumentPreviewError("ABORTED"));
        continue;
      }

      active += 1;
      entry.signal?.removeEventListener?.("abort", entry.onAbort);
      let released = false;
      entry.resolve(() => {
        if (!released) {
          released = true;
          active -= 1;
          pump();
        }
      });
    }
  };

  return {
    get active() {
      return active;
    },
    get waiting() {
      return queue.length;
    },
    acquire(signal) {
      return new Promise((resolve, reject) => {
        const entry = { resolve, reject, signal };
        entry.onAbort = () => {
          const index = queue.indexOf(entry);

          if (index >= 0) {
            queue.splice(index, 1);
            reject(new DocumentPreviewError("ABORTED"));
          }
        };
        signal?.addEventListener?.("abort", entry.onAbort, { once: true });
        queue.push(entry);
        pump();
      });
    },
  };
}
