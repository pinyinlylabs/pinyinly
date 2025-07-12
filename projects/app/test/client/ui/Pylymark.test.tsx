// @vitest-environment happy-dom

import { Pylymark } from "#client/ui/Pylymark.tsx";
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

describe(`${Pylymark.name} suite`, () => {
  test(`renders correctly with dumb quotes`, async () => {
    const result = render(
      <Pylymark source={`This is a 'test' with "dumb quotes"`} />,
    );
    expect(result.container).toHaveTextContent(
      `This is a ‘test’ with “dumb quotes”`,
    );
  });
});
