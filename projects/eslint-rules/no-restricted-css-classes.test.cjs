const { RuleTester } = require("eslint");
const rule = require("./no-restricted-css-classes.cjs");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  rules: {
    "rule-to-test/no-restricted-css-classes": [
      "error",
      {
        classes: [
          // use the default message
          "flex-col",
          // use a custom message
          { name: "flex-row", message: "Columns are better than rows." },
        ],
      },
    ],
  },
});

ruleTester.run("no-restricted-css-classes", rule, {
  valid: [
    {
      // Shouldn't match "flex-col".
      code: `const el = <div className="flex-column" />`,
    },
    {
      // Shouldn't match "flex-col".
      code: `const txt = "flex-column";`,
    },
  ],

  invalid: [
    // Tests for default message.
    {
      code: `const el = <div className="flex-col" />`,
      errors: [
        {
          message: 'CSS class "flex-col" is disallowed.',
        },
      ],
      output: `const el = <div className="" />`,
    },
    {
      code: `const el = <div className="flex-col flex-wrap flex-1" />`,
      errors: [
        {
          message: 'CSS class "flex-col" is disallowed.',
        },
      ],
      output: `const el = <div className="flex-wrap flex-1" />`,
    },
    {
      code: `const el = "flex-col flex-wrap flex-1";`,
      errors: [
        {
          message: 'CSS class "flex-col" is disallowed.',
        },
      ],
      output: `const el = "flex-wrap flex-1";`,
    },
    //
    // Test for custom message.
    //
    {
      code: `const el = <div className="flex-row" />`,
      errors: [
        {
          message: "Columns are better than rows.",
        },
      ],
      output: `const el = <div className="" />`,
    },
    {
      code: `const el = <div className="flex-row flex-wrap flex-1" />`,
      errors: [
        {
          message: "Columns are better than rows.",
        },
      ],
      output: `const el = <div className="flex-wrap flex-1" />`,
    },
    {
      code: `const el = "flex-row flex-wrap flex-1";`,
      errors: [
        {
          message: "Columns are better than rows.",
        },
      ],
      output: `const el = "flex-wrap flex-1";`,
    },
    {
      code: "const el = `flex-row flex-wrap flex-1`;",
      errors: [
        {
          message: "Columns are better than rows.",
        },
      ],
      output: "const el = `flex-wrap flex-1`;",
    },
    {
      code: `const el = "flex-row \\"";`,
      errors: [
        {
          message: "Columns are better than rows.",
        },
      ],
      output: `const el = "\\"";`,
    },
    {
      code: "const el = `flex-row \\``;",
      errors: [
        {
          message: "Columns are better than rows.",
        },
      ],
      output: "const el = `\\``;",
    },
  ],
});
