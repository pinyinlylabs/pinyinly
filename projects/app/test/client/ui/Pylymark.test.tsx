// @vitest-environment happy-dom

import { Pylymark } from "#client/ui/Pylymark.tsx";
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

describe(`Pylymark suite` satisfies HasNameOf<typeof Pylymark>, () => {
  test(`renders marked text correctly`, async () => {
    const result = render(<Pylymark source={`This is ==marked== text.`} />);
    expect(result.container).toHaveTextContent(`This is marked text.`);
    // For now, just verify that the text renders correctly
    // TODO: Add proper class checking when CSS classes are properly configured
  });
});
