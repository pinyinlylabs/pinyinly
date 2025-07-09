// @vitest-environment happy-dom

import { Hhhmark } from "#client/ui/Hhhmark.tsx";
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

describe(`${Hhhmark.name} suite`, () => {
  test(`renders correctly with dumb quotes`, async () => {
    const result = render(
      <Hhhmark source={`This is a 'test' with "dumb quotes"`} />,
    );
    expect(result.container).toHaveTextContent(
      `This is a ‘test’ with “dumb quotes”`,
    );
  });
});
