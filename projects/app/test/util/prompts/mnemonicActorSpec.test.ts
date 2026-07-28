import { buildMnemonicActorProfilePrompt } from "#util/prompts/mnemonicActorSpec.ts";
import { describe, expect, test } from "vitest";

describe(
  `buildMnemonicActorProfilePrompt` satisfies HasNameOf<
    typeof buildMnemonicActorProfilePrompt
  >,
  () => {
    test(`uses mnemonic actor system prompt and input wrapper`, () => {
      const result = buildMnemonicActorProfilePrompt({
        identity: `Dracula`,
      });

      expect(result.model).toBe(`gpt-5-mini`);
      expect(result.reasoningEffort).toBe(`medium`);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]?.role).toBe(`system`);
      expect(typeof result.messages[0]?.content).toBe(`string`);
      expect(result.messages[1]?.role).toBe(`user`);
      expect(typeof result.messages[1]?.content).toBe(`string`);

      expect(result.messages[0]?.content).toContain(
        `You are designing a recurring mnemonic actor for a Chinese language learning system.`,
      );
      expect(result.messages[1]?.content).toContain(
        `Generate a mnemonic actor for:`,
      );

      expect(result.messages[1]?.content).toContain(`"identity": "Dracula"`);
    });
  },
);
