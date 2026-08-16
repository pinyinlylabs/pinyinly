import { noRestrictedCssClasses } from "#no-restricted-css-classes.ts";
import { RuleTester } from "oxlint/plugins-dev";
import { describe, test as it } from "vitest";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    sourceType: `module`,
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

const options = [
  {
    classes: [
      // use the default message
      `flex-col`,
      // use a custom message
      { name: `flex-row`, message: `Columns are better than rows.` },
    ],
  },
];

ruleTester.run(`no-restricted-css-classes`, noRestrictedCssClasses, {
  valid: [
    {
      // Shouldn't match "flex-col".
      code: `const el = <div className="flex-column" />`,
      options,
    },
    {
      // Shouldn't match "flex-col".
      code: `const txt = "flex-column";`,
      options,
    },
  ],

  invalid: [
    // Tests for default message.
    {
      code: `const el = <div className="flex-col" />`,
      options,
      errors: [
        {
          message: `CSS class "flex-col" is disallowed.`,
        },
      ],
      output: `const el = <div className="" />`,
    },
    {
      code: `const el = <div className="flex-col flex-wrap flex-1" />`,
      options,
      errors: [
        {
          message: `CSS class "flex-col" is disallowed.`,
        },
      ],
      output: `const el = <div className="flex-wrap flex-1" />`,
    },
    {
      code: `const el = "flex-col flex-wrap flex-1";`,
      options,
      errors: [
        {
          message: `CSS class "flex-col" is disallowed.`,
        },
      ],
      output: `const el = "flex-wrap flex-1";`,
    },
    //
    // Test for custom message.
    //
    {
      code: `const el = <div className="flex-row" />`,
      options,
      errors: [
        {
          message: `Columns are better than rows.`,
        },
      ],
      output: `const el = <div className="" />`,
    },
    {
      code: `const el = <div className="flex-row flex-wrap flex-1" />`,
      options,
      errors: [
        {
          message: `Columns are better than rows.`,
        },
      ],
      output: `const el = <div className="flex-wrap flex-1" />`,
    },
    {
      code: `const el = "flex-row flex-wrap flex-1";`,
      options,
      errors: [
        {
          message: `Columns are better than rows.`,
        },
      ],
      output: `const el = "flex-wrap flex-1";`,
    },
    {
      code: `const el = \`flex-row flex-wrap flex-1\`;`,
      options,
      errors: [
        {
          message: `Columns are better than rows.`,
        },
      ],
      output: `const el = \`flex-wrap flex-1\`;`,
    },
    {
      code: `const el = "flex-row \\"";`,
      options,
      errors: [
        {
          message: `Columns are better than rows.`,
        },
      ],
      output: `const el = "\\"";`,
    },
    {
      code: `const el = \`flex-row \\\`\`;`,
      options,
      errors: [
        {
          message: `Columns are better than rows.`,
        },
      ],
      output: `const el = \`\\\`\`;`,
    },
  ],
});
