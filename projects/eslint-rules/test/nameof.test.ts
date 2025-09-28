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
      // Different symbol name that matches
      code: `'Foo.Bar' as NameOf<typeof Foo.Bar>`,
    },
    {
      // Valid with HasNameOf
      code: `'hasNameOfTest' as HasNameOf<typeof hasNameOfTest>`,
    },
    {
      // Valid with HasNameOf
      code: `'Foo.Bar other text' as HasNameOf<typeof Foo.Bar>`,
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
      // Incorrect string - doesn't match symbol name
      code: `'Foo.Baz' as NameOf<typeof Foo.Bar>`,
      errors: [
        {
          messageId: `mismatch`,
          data: {
            actual: `Foo.Baz`,
            expected: `Foo.Bar`,
          },
        },
      ],
      output: `'Foo.Bar' as NameOf<typeof Foo.Bar>`,
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
    {
      // HasNameOf with wrong string
      code: `'Foo.Baz text' satisfies HasNameOf<typeof Foo.Bar>`,
      errors: [
        {
          messageId: `hasNameOfMismatch`,
          data: {
            actual: `Foo.Baz text`,
            expected: `Foo.Bar`,
          },
        },
      ],
      output: `'Foo.Bar text' satisfies HasNameOf<typeof Foo.Bar>`,
    },
  ],
});
