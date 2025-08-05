import * as typescriptParser from "@typescript-eslint/parser";
import { RuleTester } from "eslint";
import { nameof } from "../src/nameof.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: `module`,
    parser: typescriptParser,
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  rules: {
    [`rule-to-test/nameof`]: [`error`],
  },
});

ruleTester.run(`nameof`, nameof, {
  valid: [
    {
      // Correct string matching symbol name
      code: `'NewWordTutorial' as NameOf<typeof NewWordTutorial>`,
    },
    {
      // Different symbol name that matches
      code: `'myFunction' as NameOf<typeof myFunction>`,
    },
    {
      // Valid with HasNameOf
      code: `'hasNameOfTest' as HasNameOf<typeof hasNameOfTest>`,
    },
  ],
  invalid: [
    {
      // Incorrect string - doesn't match symbol name
      code: `'WrongName' as NameOf<typeof NewWordTutorial>`,
      errors: [
        {
          messageId: `mismatch`,
          data: {
            actual: `WrongName`,
            expected: `NewWordTutorial`,
          },
        },
      ],
      output: `'NewWordTutorial' as NameOf<typeof NewWordTutorial>`,
    },
    {
      // HasNameOf with wrong string
      code: `'wrong text' satisfies HasNameOf<typeof MyClass>`,
      errors: [
        {
          messageId: `hasNameOfMismatch`,
          data: {
            actual: `wrong text`,
            expected: `MyClass`,
          },
        },
      ],
      output: `'MyClass text' satisfies HasNameOf<typeof MyClass>`,
    },
  ],
});
