import { useChoicePairQuizTimer } from "#client/hooks.ts";
import { act, renderHook } from "@testing-library/react-native";
import test from "node:test";

await test(`${useChoicePairQuizTimer.name} suite`, async (t) => {
  await t.test(
    `records time correctly for correct and incorrect choices`,
    async () => {
      t.mock.timers.enable({ apis: [`Date`] });

      const { result } = renderHook(() =>
        useChoicePairQuizTimer<string>(`correct1`, `correct2`),
      );

      // Simulate 100ms elapsed
      t.mock.timers.tick(100);

      // Initially, endTime should be undefined
      expect(result.current.endTime).toBeUndefined();

      // Record the first correct choice
      act(() => {
        result.current.recordChoice(`correct1`);
      });

      // endTime should now be set to 100ms (the time at which the correct
      // choice was recorded).
      expect(result.current.endTime).toBe(100);

      // Simulate more time passing (100ms) and ensure endTime remains constant
      t.mock.timers.tick(100);
      expect(result.current.endTime).toBe(100);

      // Record the second correct choice
      act(() => {
        result.current.recordChoice(`correct2`);
      });

      // Simulate additional time passing (100ms) and ensure endTime remains unchanged
      t.mock.timers.tick(100);
      expect(result.current.endTime).toBe(100);

      // Record an incorrect choice
      act(() => {
        result.current.recordChoice(`wrong`);
      });

      // endTime should reset to undefined
      expect(result.current.endTime).toBeUndefined();

      // Record a correct choice again
      act(() => {
        result.current.recordChoice(`correct1`);
      });

      // Simulate 100ms elapsed after the reset
      t.mock.timers.tick(100);

      // endTime should now reflect the new correct choice time (300ms total elapsed)
      expect(result.current.endTime).toBe(300);
    },
  );
});
