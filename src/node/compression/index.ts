import { type CompressionResult, compress, InputSchema } from "../../common/compression.ts"

export const handler = async (event: unknown): Promise<CompressionResult> => {
  const start = performance.now()
  const { data } = InputSchema.parse(event)
  const result = compress(data)
  const durationMs = performance.now() - start
  return { ...result, durationMs }
}
