import * as z from "zod";
import { gzipSync, gunzipSync } from "node:zlib";

const InputSchema = z.object({
  data: z.string(), // base64 encoded
});

export const handler = async (
  event: unknown,
): Promise<{
  originalSize: number;
  compressedSize: number;
  decompressedSize: number;
  ratio: string;
}> => {
  const { data } = InputSchema.parse(event);

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
};
