import { type ArrayOpsResult, InputSchema, runArrayOps } from "../../common/arrayOps.ts"

export const handler = async (event: unknown): Promise<ArrayOpsResult> => {
  const start = performance.now()
  const { size, seed } = InputSchema.parse(event)
  const result = runArrayOps(size, seed)
  const durationMs = performance.now() - start
  return { ...result, durationMs }
}
