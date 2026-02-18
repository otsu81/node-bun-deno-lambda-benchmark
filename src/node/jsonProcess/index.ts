import { InputSchema, transformPayload, type Payload } from "../../common/jsonProcess.ts";

export const handler = async (
  event: unknown,
): Promise<{
  inputSize: number;
  outputSize: number;
  productsProcessed: number;
  ordersProcessed: number;
}> => {
  const { raw } = InputSchema.parse(event);
  const parsed: Payload = JSON.parse(raw);
  const transformed = transformPayload(parsed);
  const output = JSON.stringify(transformed);

  return {
    inputSize: raw.length,
    outputSize: output.length,
    productsProcessed: transformed.products.length,
    ordersProcessed: transformed.orders.length,
  };
};
