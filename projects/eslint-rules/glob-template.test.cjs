const { RuleTester } = require("eslint");
const rule = require("./glob-template.cjs");

const validCodeCustomTemplate =
  '// <pyly-glob-template glob="./glob-template.test/*.svg" template="require(\'${path}\');">\n' +
  "require('./glob-template.test/a.svg');\n" +
  "require('./glob-template.test/b.svg');\n" +
  "require('./glob-template.test/c.svg');\n" +
  "// </pyly-glob-template>";

const validCodeExtraWhitespace =
  "const allIcons = [\n" +
  '  // <pyly-glob-template   glob="./glob-template.test/*.svg"   template="  require(\'${path}\'),"   >\n' +
  "  require('./glob-template.test/a.svg'),\n" +
  "  require('./glob-template.test/b.svg'),\n" +
  "  require('./glob-template.test/c.svg'),\n" +
  "// </pyly-glob-template>\n" +
  "];";

const validCodeParentDir =
  "const allIcons = [\n" +
  '  // <pyly-glob-template glob="../eslint-rules/glob-template.test/*.svg" template="  require(\'${path}\'),">\n' +
  "  require('../eslint-rules/glob-template.test/a.svg'),\n" +
  "  require('../eslint-rules/glob-template.test/b.svg'),\n" +
  "  require('../eslint-rules/glob-template.test/c.svg'),\n" +
  "// </pyly-glob-template>\n" +
  "];";

const validCodeTwoParentDir =
  "const allIcons = [\n" +
  '  // <pyly-glob-template glob="../../projects/eslint-rules/glob-template.test/*.svg" template="  require(\'${path}\'),">\n' +
  "  require('../../projects/eslint-rules/glob-template.test/a.svg'),\n" +
  "  require('../../projects/eslint-rules/glob-template.test/b.svg'),\n" +
  "  require('../../projects/eslint-rules/glob-template.test/c.svg'),\n" +
  "// </pyly-glob-template>\n" +
  "];";

const missingFileCode =
  "const allIcons = [\n" +
  '  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  require(\'${path}\'),">\n' +
  "  require('./glob-template.test/a.svg'),\n" +
  "  require('./glob-template.test/c.svg'),\n" +
  "// </pyly-glob-template>\n" +
  "];";

const missingFileCodeCustomTemplate =
  '// <pyly-glob-template glob="./glob-template.test/*.svg" template="require(\'${path}\');">\n' +
  "require('./glob-template.test/a.svg');\n" +
  "require('./glob-template.test/c.svg');\n" +
  "// </pyly-glob-template>";

const missingFileObjectLiteral =
  "const iconMap = {\n" +
  '  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  ${filenameWithoutExt}: require(\'${path}\'),">\n' +
  "  a: require('./glob-template.test/a.svg'),\n" +
  "  c: require('./glob-template.test/c.svg'),\n" +
  "// </pyly-glob-template>\n" +
  "};";

const missingFileTopLevel =
  '// <pyly-glob-template glob="./glob-template.test/*.svg" template="const ${filenameWithoutExt} = require(\'${path}\');">\n' +
  "const a = require('./glob-template.test/a.svg');\n" +
  "const c = require('./glob-template.test/c.svg');\n" +
  "// </pyly-glob-template>";

const extraFileCode =
  "const allIcons = [\n" +
  '  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  require(\'${path}\'),">\n' +
  "  require('./glob-template.test/a.svg'),\n" +
  "  require('./glob-template.test/b.svg'),\n" +
  "  require('./glob-template.test/c.svg'),\n" +
  "  require('./glob-template.test/d.svg'),\n" +
  "// </pyly-glob-template>\n" +
  "];";

const expectedOutput =
  "const allIcons = [\n" +
  '  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  require(\'${path}\'),">\n' +
  "  require('./glob-template.test/a.svg'),\n" +
  "  require('./glob-template.test/b.svg'),\n" +
  "  require('./glob-template.test/c.svg'),\n" +
  "// </pyly-glob-template>\n" +
  "];";

const expectedOutputCustomTemplate =
  '// <pyly-glob-template glob="./glob-template.test/*.svg" template="require(\'${path}\');">\n' +
  "require('./glob-template.test/a.svg');\n" +
  "require('./glob-template.test/b.svg');\n" +
  "require('./glob-template.test/c.svg');\n" +
  "// </pyly-glob-template>";

const expectedOutputObjectLiteral =
  "const iconMap = {\n" +
  '  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  ${filenameWithoutExt}: require(\'${path}\'),">\n' +
  "  a: require('./glob-template.test/a.svg'),\n" +
  "  b: require('./glob-template.test/b.svg'),\n" +
  "  c: require('./glob-template.test/c.svg'),\n" +
  "// </pyly-glob-template>\n" +
  "};";

const expectedOutputTopLevel =
  '// <pyly-glob-template glob="./glob-template.test/*.svg" template="const ${filenameWithoutExt} = require(\'${path}\');">\n' +
  "const a = require('./glob-template.test/a.svg');\n" +
  "const b = require('./glob-template.test/b.svg');\n" +
  "const c = require('./glob-template.test/c.svg');\n" +
  "// </pyly-glob-template>";

const invalidNoGlob =
  "const allIcons = [\n" +
  "  // <pyly-glob-template template=\"  require('${path}'),\">\n" +
  "  // </pyly-glob-template>\n" +
  "];";

const invalidNoTemplate =
  "const allIcons = [\n" +
  '  // <pyly-glob-template glob="./glob-template.test/*.svg">\n' +
  "  // </pyly-glob-template>\n" +
  "];";

const invalidExtraAttr =
  "const allIcons = [\n" +
  '  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  require(\'${path}\')," foo="bar">\n' +
  "  // </pyly-glob-template>\n" +
  "];";

const invalidWrongAttr =
  "const allIcons = [\n" +
  '  // <pyly-glob-template foo="bar">\n' +
  "  // </pyly-glob-template>\n" +
  "];";

const invalidTemplateOnly =
  "const allIcons = [\n" +
  "  // <pyly-glob-template template=\"import ${pathWithoutExt} from '${path}';\">\n" +
  "  // </pyly-glob-template>\n" +
  "];";

const invalidNonexistentDir =
  "const allIcons = [\n" +
  '  // <pyly-glob-template glob="./glob-template.test/does-not-exist/*.svg" template="  require(\'${path}\'),">\n' +
  "  // </pyly-glob-template>\n" +
  "];";

const invalidFileInsteadOfDir =
  "const allIcons = [\n" +
  '  // <pyly-glob-template glob="./glob-template.test/a.svg/*.svg" template="  require(\'${path}\'),">\n' +
  "  // </pyly-glob-template>\n" +
  "];";

const validCodeObjectLiteral =
  "const iconMap = {\n" +
  '  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  ${filenameWithoutExt}: require(\'${path}\'),">\n' +
  "  a: require('./glob-template.test/a.svg'),\n" +
  "  b: require('./glob-template.test/b.svg'),\n" +
  "  c: require('./glob-template.test/c.svg'),\n" +
  "// </pyly-glob-template>\n" +
  "};";

const validCodeObjectLiteralImports =
  "const icons = {\n" +
  '  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  ${filenameWithoutExt}: () => import(\'${path}\'),">\n' +
  "  a: () => import('./glob-template.test/a.svg'),\n" +
  "  b: () => import('./glob-template.test/b.svg'),\n" +
  "  c: () => import('./glob-template.test/c.svg'),\n" +
  "// </pyly-glob-template>\n" +
  "};";

const validCodeTopLevelStatements =
  '// <pyly-glob-template glob="./glob-template.test/*.svg" template="const ${filenameWithoutExt} = require(\'${path}\');">\n' +
  "const a = require('./glob-template.test/a.svg');\n" +
  "const b = require('./glob-template.test/b.svg');\n" +
  "const c = require('./glob-template.test/c.svg');\n" +
  "// </pyly-glob-template>";

const validCodeShowingDifference =
  '// <pyly-glob-template glob="./glob-template.test/*.svg" template="  // File: ${filenameWithoutExt}">\n' +
  "  // File: a\n" +
  "  // File: b\n" +
  "  // File: c\n" +
  "// </pyly-glob-template>";

const validCodeWithParentDir =
  "const iconsByDirectory = {\n" +
  '  // <pyly-glob-template glob="./glob-template.test/**/*.svg" template="  \\"${parentDir}\\": require(\'${path}\'),">\n' +
  "  \"glob-template.test\": require('./glob-template.test/a.svg'),\n" +
  "  \"glob-template.test\": require('./glob-template.test/b.svg'),\n" +
  "  \"glob-template.test\": require('./glob-template.test/c.svg'),\n" +
  "  \"nested\": require('./glob-template.test/nested/d.svg'),\n" +
  "// </pyly-glob-template>\n" +
  "};";

const validCodeWithParentDirAndFilenameWithoutExt =
  "const iconsByDirectory = {\n" +
  '  // <pyly-glob-template glob="./glob-template.test/**/*.svg" template="  \\"${parentDir}\\": \'${filenameWithoutExt}\',">\n' +
  "  \"glob-template.test\": 'a',\n" +
  "  \"glob-template.test\": 'b',\n" +
  "  \"glob-template.test\": 'c',\n" +
  "  \"nested\": 'd',\n" +
  "// </pyly-glob-template>\n" +
  "};";

const simpleValidCode =
  "const allIcons = [\n" +
  '  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  require(\'${path}\'),">\n' +
  "  require('./glob-template.test/a.svg'),\n" +
  "  require('./glob-template.test/b.svg'),\n" +
  "  require('./glob-template.test/c.svg'),\n" +
  "// </pyly-glob-template>\n" +
  "];";

const validCodeWithQuotesInTemplate =
  "const allIcons = [\n" +
  '  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  {\\"name\\": \\"${filenameWithoutExt}\\", path: \\"${path}\\"},">\n' +
  '  {"name": "a", path: "./glob-template.test/a.svg"},\n' +
  '  {"name": "b", path: "./glob-template.test/b.svg"},\n' +
  '  {"name": "c", path: "./glob-template.test/c.svg"},\n' +
  "// </pyly-glob-template>\n" +
  "];";

const missingFileWithQuotesInTemplate =
  "const allIcons = [\n" +
  '  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  {\\"name\\": \\"${filenameWithoutExt}\\", path: \\"${path}\\"},">\n' +
  '  {"name": "a", path: "./glob-template.test/a.svg"},\n' +
  '  {"name": "c", path: "./glob-template.test/c.svg"},\n' +
  "// </pyly-glob-template>\n" +
  "];";

const expectedOutputWithQuotesInTemplate =
  "const allIcons = [\n" +
  '  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  {\\"name\\": \\"${filenameWithoutExt}\\", path: \\"${path}\\"},">\n' +
  '  {"name": "a", path: "./glob-template.test/a.svg"},\n' +
  '  {"name": "b", path: "./glob-template.test/b.svg"},\n' +
  '  {"name": "c", path: "./glob-template.test/c.svg"},\n' +
  "// </pyly-glob-template>\n" +
  "];";

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
    "rule-to-test/glob-template": ["error"],
  },
});

ruleTester.run("glob-template", rule, {
  valid: [
    {
      code: simpleValidCode,
      filename: __filename,
    },
    {
      code: validCodeCustomTemplate,
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
    {
      code: validCodeObjectLiteral,
      filename: __filename,
    },
    {
      code: validCodeObjectLiteralImports,
      filename: __filename,
    },
    {
      code: validCodeTopLevelStatements,
      filename: __filename,
    },
    {
      code: validCodeShowingDifference,
      filename: __filename,
    },
    {
      code: validCodeWithQuotesInTemplate,
      filename: __filename,
    },
    {
      code: validCodeWithParentDir,
      filename: __filename,
    },
    {
      code: validCodeWithParentDirAndFilenameWithoutExt,
      filename: __filename,
    },
  ],
  invalid: [
    {
      code: missingFileCode,
      filename: __filename,
      errors: [
        { message: /Generated code is out of sync with files matching/ },
      ],
      output: expectedOutput,
    },
    {
      code: missingFileCodeCustomTemplate,
      filename: __filename,
      errors: [
        { message: /Generated code is out of sync with files matching/ },
      ],
      output: expectedOutputCustomTemplate,
    },
    {
      code: missingFileObjectLiteral,
      filename: __filename,
      errors: [
        { message: /Generated code is out of sync with files matching/ },
      ],
      output: expectedOutputObjectLiteral,
    },
    {
      code: missingFileTopLevel,
      filename: __filename,
      errors: [
        { message: /Generated code is out of sync with files matching/ },
      ],
      output: expectedOutputTopLevel,
    },
    {
      code: extraFileCode,
      filename: __filename,
      errors: [
        { message: /Generated code is out of sync with files matching/ },
      ],
      output: expectedOutput,
    },
    {
      code: missingFileWithQuotesInTemplate,
      filename: __filename,
      errors: [
        { message: /Generated code is out of sync with files matching/ },
      ],
      output: expectedOutputWithQuotesInTemplate,
    },
    {
      code: invalidNoGlob,
      filename: __filename,
      errors: [{ message: /must have glob and template attributes/ }],
    },
    {
      code: invalidNoTemplate,
      filename: __filename,
      errors: [{ message: /must have glob and template attributes/ }],
    },
    {
      code: invalidTemplateOnly,
      filename: __filename,
      errors: [{ message: /must have glob and template attributes/ }],
    },
    {
      code: invalidExtraAttr,
      filename: __filename,
      errors: [{ message: /must have glob and template attributes/ }],
    },
    {
      code: invalidWrongAttr,
      filename: __filename,
      errors: [{ message: /must have glob and template attributes/ }],
    },
    {
      code: invalidNonexistentDir,
      filename: __filename,
      errors: [{ message: /Could not process glob pattern/ }],
    },
    {
      code: invalidFileInsteadOfDir,
      filename: __filename,
      errors: [{ message: /Could not process glob pattern/ }],
    },
  ],
});
