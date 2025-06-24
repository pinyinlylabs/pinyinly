import { maybeParseVercelError } from "#client/trpc.tsx";
import { describe, expect, test } from "vitest";

describe(`${maybeParseVercelError.name} suite`, () => {
  test(`ignores normal responses`, () => {
    const result = maybeParseVercelError(
      Response.json({ message: `Hello, world!` }),
    );

    expect(result).toBeUndefined();
  });

  test(`vercel edge errors are parsed`, () => {
    const httpResponse = new Response(
      `An error occurred with your deployment
  
  FUNCTION_INVOCATION_TIMEOUT
  
  syd1::m6bjf-1738011631946-6a41c1b3d99c`,
      {
        status: 504,
        headers: {
          "x-vercel-error": `FUNCTION_INVOCATION_TIMEOUT`,
          "x-vercel-id": `syd1::gqwrj-1738016771255-d9363c982187`,
        },
      },
    );

    const error = maybeParseVercelError(httpResponse);

    expect(error).toBeTruthy();
    // Type assertion since we've already verified error exists with toBeTruthy
    expect(error?.id).toBe(`syd1::gqwrj-1738016771255-d9363c982187`);
    expect(error?.code).toBe(`FUNCTION_INVOCATION_TIMEOUT`);
  });
});
