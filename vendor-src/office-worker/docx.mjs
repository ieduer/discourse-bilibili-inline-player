import mammoth from "mammoth";
import { PreviewError } from "./errors.mjs";

export const DOCX_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/bmp",
]);

export const DOCX_IMAGE_SOURCE_PREFIX = "rich-embeds-image:";

// Underline and strikethrough are dropped by mammoth's default map. Word
// stores built-in style names in English, but documents written by WPS and
// some localized templates use the Chinese display names.
const STYLE_MAP = [
  "p[style-name='Title'] => h1.doc-title:fresh",
  "p[style-name='Subtitle'] => p.doc-subtitle:fresh",
  "u => u",
  "strike => s",
  "p[style-name='标题'] => h1:fresh",
  "p[style-name='标题 1'] => h1:fresh",
  "p[style-name='标题 2'] => h2:fresh",
  "p[style-name='标题 3'] => h3:fresh",
  "p[style-name='标题 4'] => h4:fresh",
  "p[style-name='标题 5'] => h5:fresh",
  "p[style-name='标题 6'] => h6:fresh",
  "p[style-name='副标题'] => p.doc-subtitle:fresh",
];

/**
 * Converts a sanitized DOCX package to semantic HTML with mammoth. Images are
 * returned as separate byte arrays so the page can create blob URLs for the
 * allowed raster types; the HTML refers to them by index only.
 */
export async function convertDocx(packageBytes, limits, checkDeadline = () => {}) {
  const images = [];
  let imageBytes = 0;
  let skippedImages = 0;

  const convertImage = mammoth.images.imgElement(async (image) => {
    checkDeadline();
    const contentType = String(image.contentType || "").toLowerCase();

    if (!DOCX_IMAGE_TYPES.has(contentType) || images.length >= limits.maxImages) {
      skippedImages += 1;
      return { src: "" };
    }

    // mammoth's browser build returns a Uint8Array view here. Copy it into an
    // ArrayBuffer of its own so it can be transferred to the page.
    const data = await image.readAsArrayBuffer();
    const view =
      data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const buffer = view.slice().buffer;

    if (imageBytes + buffer.byteLength > limits.maxImageBytes) {
      skippedImages += 1;
      return { src: "" };
    }

    imageBytes += buffer.byteLength;
    images.push({ contentType, buffer });
    return { src: `${DOCX_IMAGE_SOURCE_PREFIX}${images.length - 1}` };
  });

  let result;

  try {
    result = await mammoth.convertToHtml(
      { arrayBuffer: packageBytes.buffer.slice(packageBytes.byteOffset, packageBytes.byteOffset + packageBytes.byteLength) },
      {
        convertImage,
        styleMap: STYLE_MAP,
        includeDefaultStyleMap: true,
        includeEmbeddedStyleMap: false,
        idPrefix: "doc-",
      }
    );
  } catch (error) {
    if (error instanceof PreviewError) {
      throw error;
    }

    throw new PreviewError("PARSE_FAILED", "The document could not be converted");
  }

  checkDeadline();

  if (typeof result?.value !== "string") {
    throw new PreviewError("PARSE_FAILED", "The converter returned no document");
  }

  if (result.value.length > limits.maxHtmlChars) {
    throw new PreviewError("TOO_LARGE", "Converted document exceeds the preview limit");
  }

  return {
    html: result.value,
    images,
    skippedImages,
    warningCount: Array.isArray(result.messages) ? result.messages.length : 0,
  };
}
