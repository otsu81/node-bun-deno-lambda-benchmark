import { InputSchema, transformPayload, type Payload } from "../../common/jsonProcess.ts";

export const handler = async (
  event: unknown,
): Promise<{
  inputSize: number;
  outputSize: number;
  productsProcessed: number;
  ordersProcessed: number;
}> => {
  const start = performance.now();
  const { raw } = InputSchema.parse(event);
  const parsed: Payload = JSON.parse(raw);
  const transformed = transformPayload(parsed);
  const output = JSON.stringify(transformed);
  const durationMs = performance.now() - start;

  return {
    inputSize: raw.length,
    outputSize: output.length,
    productsProcessed: transformed.products.length,
    ordersProcessed: transformed.orders.length,
    durationMs,
  };
};
