import * as z from "zod";
import { gzipSync, gunzipSync } from "node:zlib";
import { Buffer } from "node:buffer";

export const InputSchema = z.object({
  data: z.string(),
});

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  decompressedSize: number;
  ratio: string;
}

export function compress(data: string): CompressionResult {
  const input = Buffer.from(data, "base64");
  const compressed = gzipSync(input);
  const decompressed = gunzipSync(compressed);

  if (decompressed.length !== input.length) {
    throw new Error("Decompression mismatch");
  }

  return {
    originalSize: input.length,
    compressedSize: compressed.length,
    decompressedSize: decompressed.length,
    ratio: (compressed.length / input.length).toFixed(3),
  };
}
