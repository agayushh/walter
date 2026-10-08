import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const MAX_CHARS = 200_000;

export async function extractFileText(file: File) {
  const name = file.name || "upload";
  const lower = name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());

  let text = "";
  if (lower.endsWith(".pdf") || file.type === "application/pdf") {
    PDFParse.setWorker();
    const parser = new PDFParse({ data: bytes });
    try {
      const result = await parser.getText();
      text = result.text ?? "";
    } finally {
      await parser.destroy();
    }
  } else if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    text = result.value ?? "";
  } else if (
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".json") ||
    file.type.startsWith("text/")
  ) {
    text = new TextDecoder().decode(bytes);
  } else {
    throw new Error("Upload a PDF, DOCX, TXT, MD, CSV, or JSON file.");
  }

  text = text.replace(/\u0000/g, "").trim();
  if (!text) {
    throw new Error("No text could be read from that file.");
  }
  return {
    fileName: name.slice(0, 180),
    content: text.slice(0, MAX_CHARS),
  };
}
