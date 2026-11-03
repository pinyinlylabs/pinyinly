import { passkeyErrorMessage, supportsPasskeys } from "#client/passkey.ts";
import { expect, test } from "vitest";

test(`reports cancellation, domain support, duplicates and unexpected failures`, () => {
  expect(
    passkeyErrorMessage(new DOMException(``, `NotAllowedError`)),
  ).toContain(`cancelled`);
  expect(passkeyErrorMessage(new DOMException(``, `AbortError`))).toContain(
    `cancelled`,
  );
  expect(passkeyErrorMessage(new DOMException(``, `SecurityError`))).toContain(
    `Related Origin Requests`,
  );
  expect(
    passkeyErrorMessage(new DOMException(``, `InvalidStateError`)),
  ).toContain(`already registered`);
  expect(passkeyErrorMessage(new Error(`private detail`))).not.toContain(
    `private detail`,
  );
  expect(passkeyErrorMessage(null)).toContain(`try again`);
  expect(supportsPasskeys()).toBe(false);
});
