import { InputSchema, compress, type CompressionResult } from "../../common/compression.ts";

export const handler = async (event: unknown): Promise<CompressionResult> => {
  const { data } = InputSchema.parse(event);
  return compress(data);
};
