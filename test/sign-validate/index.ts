import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import payloads from "../fakerdata/generatedJson/jwtPayloads.json";

const { SIGN_FUNCTION, VALIDATE_FUNCTION } = process.env;
if (!SIGN_FUNCTION || !VALIDATE_FUNCTION)
  throw new Error(
    "either SIGN_FUNCTION or VALIDATE_FUNCTION isn't set, required to run the test",
  );

const lambda = new LambdaClient({});

async function invoke(
  functionName: string,
  payload: unknown,
): Promise<unknown> {
  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: Buffer.from(JSON.stringify(payload)),
  });

  const response = await lambda.send(command);

  if (response.FunctionError) {
    throw new Error(`Lambda error: ${response.FunctionError}`);
  }

  return JSON.parse(Buffer.from(response.Payload!).toString());
}

async function run() {
  console.log(`Running ${payloads.length} sign-validate cycles`);

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];

    const signResult = await invoke(SIGN_FUNCTION!, payload);
    const validateResult = await invoke(VALIDATE_FUNCTION!, signResult);

    console.log({ signResult, validateResult });

    if ((i + 1) % 100 === 0) {
      console.log(`Completed ${i + 1}/${payloads.length}`);
    }
  }

  console.log("Done");
}

run().catch(console.error);
