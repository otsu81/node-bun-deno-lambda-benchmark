import { InputSchema, runArrayOps, type ArrayOpsResult } from "../../common/arrayOps.ts";

export const handler = async (event: unknown): Promise<ArrayOpsResult> => {
  const { size, seed } = InputSchema.parse(event);
  return runArrayOps(size, seed);
};
