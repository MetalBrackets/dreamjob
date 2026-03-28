import { readFile } from "node:fs/promises";
import pdfParse from "pdf-parse";

/**
 * Extract plain text from a PDF file on disk.
 * Throws a descriptive error for corrupt or empty PDFs.
 */
export async function extractTextFromPDF(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);

  if (buffer.length === 0) {
    throw new Error("PDF file is empty (0 bytes)");
  }

  let parsed;
  try {
    parsed = await pdfParse(buffer);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown parsing error";
    throw new Error(`Failed to parse PDF: ${message}`);
  }

  const text = parsed.text.trim();
  if (text.length === 0) {
    throw new Error("PDF contains no extractable text");
  }

  return text;
}
