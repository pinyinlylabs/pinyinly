import { Hhhmark } from "#client/ui/Hhhmark.tsx";
import { render } from "@testing-library/react-native";
import test from "node:test";

await test(`${Hhhmark.name} suite`, async (t) => {
  await t.test(`renders correctly with dumb quotes`, async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- bug in no-unsafe-assignment
    const { root } = render(
      <Hhhmark source={`This is a 'test' with "dumb quotes"`} />,
    );
    expect(root).toHaveTextContent(`This is a ’test’ with “dumb quotes”`);
  });
});
