import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { View, Text } from "react-native";

test(`counter button increments the count`, async () => {
  await render(
    <View testID="targetcomp">
      <View style={{ backgroundColor: `blue` }}>
        <Text>Count: {2}</Text>
      </View>
    </View>,
  );

  await expect(page.getByTestId(`targetcomp`)).toMatchScreenshot(
    `hero-section`,
  );
});
