// NOTE: These tests are illustrative. To run them for real, you would need to mock fs and path
// so that the rule sees the expected files in the directory. This is a limitation of ESLint RuleTester.

const { RuleTester } = require("eslint");
const rule = require("./require-glob.cjs");

const validCode =
  `const allIcons = [
  // <hhh-require-glob dir=\"./require-glob.test\" glob=\"*.svg\">
  require(` +
  "`./require-glob.test/a.svg`),\n" +
  `  require(` +
  "`./require-glob.test/b.svg`),\n" +
  `  require(` +
  "`./require-glob.test/c.svg`),\n" +
  `// </hhh-require-glob>
];`;

const validCodeReversedAttrs =
  `const allIcons = [
  // <hhh-require-glob glob=\"*.svg\" dir=\"./require-glob.test\">
  require(` +
  "`./require-glob.test/a.svg`),\n" +
  `  require(` +
  "`./require-glob.test/b.svg`),\n" +
  `  require(` +
  "`./require-glob.test/c.svg`),\n" +
  `// </hhh-require-glob>
];`;

const validCodeExtraWhitespace =
  `const allIcons = [
  // <hhh-require-glob   dir=\"./require-glob.test\"    glob=\"*.svg\"   >
  require(` +
  "`./require-glob.test/a.svg`),\n" +
  `  require(` +
  "`./require-glob.test/b.svg`),\n" +
  `  require(` +
  "`./require-glob.test/c.svg`),\n" +
  `// </hhh-require-glob>
];`;

const validCodeParentDir =
  `const allIcons = [
  // <hhh-require-glob dir=\"../eslint-rules/require-glob.test\" glob=\"*.svg\">
  require(` +
  "`../eslint-rules/require-glob.test/a.svg`),\n" +
  `  require(` +
  "`../eslint-rules/require-glob.test/b.svg`),\n" +
  `  require(` +
  "`../eslint-rules/require-glob.test/c.svg`),\n" +
  `// </hhh-require-glob>
];`;

const validCodeTwoParentDir =
  `const allIcons = [
  // <hhh-require-glob dir=\"../../projects/eslint-rules/require-glob.test\" glob=\"*.svg\">
  require(` +
  "`../../projects/eslint-rules/require-glob.test/a.svg`),\n" +
  `  require(` +
  "`../../projects/eslint-rules/require-glob.test/b.svg`),\n" +
  `  require(` +
  "`../../projects/eslint-rules/require-glob.test/c.svg`),\n" +
  `// </hhh-require-glob>
];`;

const missingFileCode =
  `const allIcons = [
  // <hhh-require-glob dir=\"./require-glob.test\" glob=\"*.svg\">
  require(` +
  "`./require-glob.test/a.svg`),\n" +
  `  require(` +
  "`./require-glob.test/c.svg`),\n" +
  `// </hhh-require-glob>
];`;

const extraFileCode =
  `const allIcons = [
  // <hhh-require-glob dir=\"./require-glob.test\" glob=\"*.svg\">
  require(` +
  "`./require-glob.test/a.svg`),\n" +
  `  require(` +
  "`./require-glob.test/b.svg`),\n" +
  `  require(` +
  "`./require-glob.test/c.svg`),\n" +
  `  require(` +
  "`./require-glob.test/d.svg`),\n" +
  `// </hhh-require-glob>
];`;

const expectedOutput =
  `const allIcons = [
  // <hhh-require-glob dir=\"./require-glob.test\" glob=\"*.svg\">
  require(` +
  "`./require-glob.test/a.svg`),\n" +
  `  require(` +
  "`./require-glob.test/b.svg`),\n" +
  `  require(` +
  "`./require-glob.test/c.svg`),\n" +
  `// </hhh-require-glob>
];`;

const invalidNoDir = `const allIcons = [
  // <hhh-require-glob glob=\"*.svg\">
  // </hhh-require-glob>
];`;

const invalidNoGlob = `const allIcons = [
  // <hhh-require-glob dir=\"./require-glob.test\">
  // </hhh-require-glob>
];`;

const invalidExtraAttr = `const allIcons = [
  // <hhh-require-glob dir=\"./require-glob.test\" glob=\"*.svg\" foo=\"bar\">
  // </hhh-require-glob>
];`;

const invalidWrongAttr = `const allIcons = [
  // <hhh-require-glob foo=\"bar\">
  // </hhh-require-glob>
];`;

const invalidNonexistentDir = `const allIcons = [
  // <hhh-require-glob dir=\"./require-glob.test/does-not-exist\" glob=\"*.svg\">
  // </hhh-require-glob>
];`;

const invalidFileInsteadOfDir = `const allIcons = [
  // <hhh-require-glob dir=\"./require-glob.test/a.svg\" glob=\"*.svg\">
  // </hhh-require-glob>
];`;

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
    "rule-to-test/require-glob": ["error"],
  },
});

ruleTester.run("require-glob", rule, {
  valid: [
    {
      code: validCode,
      filename: __filename,
    },
    {
      code: validCodeReversedAttrs,
      filename: __filename,
    },
    {
      code: validCodeExtraWhitespace,
      filename: __filename,
    },
    {
      code: validCodeParentDir,
      filename: __filename,
    },
    {
      code: validCodeTwoParentDir,
      filename: __filename,
    },
  ],
  invalid: [
    {
      code: missingFileCode,
      filename: __filename,
      errors: [{ message: /Require array is out of sync/ }],
      output: expectedOutput,
    },
    {
      code: extraFileCode,
      filename: __filename,
      errors: [{ message: /Require array is out of sync/ }],
      output: expectedOutput,
    },
    {
      code: invalidNoDir,
      filename: __filename,
      errors: [{ message: /must have both dir and glob attributes/ }],
    },
    {
      code: invalidNoGlob,
      filename: __filename,
      errors: [{ message: /must have both dir and glob attributes/ }],
    },
    {
      code: invalidExtraAttr,
      filename: __filename,
      errors: [{ message: /must have both dir and glob attributes/ }],
    },
    {
      code: invalidWrongAttr,
      filename: __filename,
      errors: [{ message: /must have both dir and glob attributes/ }],
    },
    {
      code: invalidNonexistentDir,
      filename: __filename,
      errors: [{ message: /Could not read directory/ }],
    },
    {
      code: invalidFileInsteadOfDir,
      filename: __filename,
      errors: [{ message: /Could not read directory/ }],
    },
  ],
});
