import { maybeParseVercelError } from "#client/trpc.tsx";
import assert from "node:assert/strict";
import test from "node:test";

void test(maybeParseVercelError.name, async () => {
  await test(`ignores normal responses`, () => {
    const result = maybeParseVercelError(
      Response.json({ message: `Hello, world!` }),
    );

    assert.ok(result === undefined);
  });

  await test(`vercel edge errors are parsed`, () => {
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

    assert.ok(error);
    assert.equal(error.id, `syd1::gqwrj-1738016771255-d9363c982187`);
    assert.equal(error.code, `FUNCTION_INVOCATION_TIMEOUT`);
  });
});
