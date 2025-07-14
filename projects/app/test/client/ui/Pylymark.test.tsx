// @vitest-environment happy-dom

import { Pylymark } from "#client/ui/Pylymark.tsx";
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

describe(`${Pylymark.name} suite`, () => {
  test(`renders highlighted text correctly`, async () => {
    const result = render(
      <Pylymark source={`This is ==highlighted== text.`} />,
    );
    expect(result.container).toHaveTextContent(`This is highlighted text.`);
    // For now, just verify that the text renders correctly
    // TODO: Add proper class checking when CSS classes are properly configured
  });
});
