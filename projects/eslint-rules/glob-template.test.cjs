const { RuleTester } = require("eslint");
const rule = require("./glob-template.cjs");

const validCodeCustomTemplate =
  '// <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="require(\'${path}\');">\n' +
  "require('./glob-template.test/a.svg');\n" +
  "require('./glob-template.test/b.svg');\n" +
  "require('./glob-template.test/c.svg');\n" +
  "// </hhh-glob-template>";

const validCodeReversedAttrs =
  "const allIcons = [\n" +
  '  // <hhh-glob-template glob="*.svg" dir="./glob-template.test" template="  require(\'${path}\'),">\n' +
  "  require('./glob-template.test/a.svg'),\n" +
  "  require('./glob-template.test/b.svg'),\n" +
  "  require('./glob-template.test/c.svg'),\n" +
  "// </hhh-glob-template>\n" +
  "];";

const validCodeExtraWhitespace =
  "const allIcons = [\n" +
  '  // <hhh-glob-template   dir="./glob-template.test"    glob="*.svg"   template="  require(\'${path}\'),"   >\n' +
  "  require('./glob-template.test/a.svg'),\n" +
  "  require('./glob-template.test/b.svg'),\n" +
  "  require('./glob-template.test/c.svg'),\n" +
  "// </hhh-glob-template>\n" +
  "];";

const validCodeParentDir =
  "const allIcons = [\n" +
  '  // <hhh-glob-template dir="../eslint-rules/glob-template.test" glob="*.svg" template="  require(\'${path}\'),">\n' +
  "  require('../eslint-rules/glob-template.test/a.svg'),\n" +
  "  require('../eslint-rules/glob-template.test/b.svg'),\n" +
  "  require('../eslint-rules/glob-template.test/c.svg'),\n" +
  "// </hhh-glob-template>\n" +
  "];";

const validCodeTwoParentDir =
  "const allIcons = [\n" +
  '  // <hhh-glob-template dir="../../projects/eslint-rules/glob-template.test" glob="*.svg" template="  require(\'${path}\'),">\n' +
  "  require('../../projects/eslint-rules/glob-template.test/a.svg'),\n" +
  "  require('../../projects/eslint-rules/glob-template.test/b.svg'),\n" +
  "  require('../../projects/eslint-rules/glob-template.test/c.svg'),\n" +
  "// </hhh-glob-template>\n" +
  "];";

const missingFileCode =
  "const allIcons = [\n" +
  '  // <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="  require(\'${path}\'),">\n' +
  "  require('./glob-template.test/a.svg'),\n" +
  "  require('./glob-template.test/c.svg'),\n" +
  "// </hhh-glob-template>\n" +
  "];";

const missingFileCodeCustomTemplate =
  '// <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="require(\'${path}\');">\n' +
  "require('./glob-template.test/a.svg');\n" +
  "require('./glob-template.test/c.svg');\n" +
  "// </hhh-glob-template>";

const missingFileObjectLiteral =
  "const iconMap = {\n" +
  '  // <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="  ${filenameWithoutExt}: require(\'${path}\'),">\n' +
  "  a: require('./glob-template.test/a.svg'),\n" +
  "  c: require('./glob-template.test/c.svg'),\n" +
  "// </hhh-glob-template>\n" +
  "};";

const missingFileTopLevel =
  '// <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="const ${filenameWithoutExt} = require(\'${path}\');">\n' +
  "const a = require('./glob-template.test/a.svg');\n" +
  "const c = require('./glob-template.test/c.svg');\n" +
  "// </hhh-glob-template>";

const extraFileCode =
  "const allIcons = [\n" +
  '  // <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="  require(\'${path}\'),">\n' +
  "  require('./glob-template.test/a.svg'),\n" +
  "  require('./glob-template.test/b.svg'),\n" +
  "  require('./glob-template.test/c.svg'),\n" +
  "  require('./glob-template.test/d.svg'),\n" +
  "// </hhh-glob-template>\n" +
  "];";

const expectedOutput =
  "const allIcons = [\n" +
  '  // <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="  require(\'${path}\'),">\n' +
  "  require('./glob-template.test/a.svg'),\n" +
  "  require('./glob-template.test/b.svg'),\n" +
  "  require('./glob-template.test/c.svg'),\n" +
  "// </hhh-glob-template>\n" +
  "];";

const expectedOutputCustomTemplate =
  '// <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="require(\'${path}\');">\n' +
  "require('./glob-template.test/a.svg');\n" +
  "require('./glob-template.test/b.svg');\n" +
  "require('./glob-template.test/c.svg');\n" +
  "// </hhh-glob-template>";

const expectedOutputObjectLiteral =
  "const iconMap = {\n" +
  '  // <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="  ${filenameWithoutExt}: require(\'${path}\'),">\n' +
  "  a: require('./glob-template.test/a.svg'),\n" +
  "  b: require('./glob-template.test/b.svg'),\n" +
  "  c: require('./glob-template.test/c.svg'),\n" +
  "// </hhh-glob-template>\n" +
  "};";

const expectedOutputTopLevel =
  '// <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="const ${filenameWithoutExt} = require(\'${path}\');">\n' +
  "const a = require('./glob-template.test/a.svg');\n" +
  "const b = require('./glob-template.test/b.svg');\n" +
  "const c = require('./glob-template.test/c.svg');\n" +
  "// </hhh-glob-template>";

const invalidNoDir =
  "const allIcons = [\n" +
  '  // <hhh-glob-template glob="*.svg" template="  require(\'${path}\'),">\n' +
  "  // </hhh-glob-template>\n" +
  "];";

const invalidNoGlob =
  "const allIcons = [\n" +
  '  // <hhh-glob-template dir="./glob-template.test" template="  require(\'${path}\'),">\n' +
  "  // </hhh-glob-template>\n" +
  "];";

const invalidNoTemplate =
  "const allIcons = [\n" +
  '  // <hhh-glob-template dir="./glob-template.test" glob="*.svg">\n' +
  "  // </hhh-glob-template>\n" +
  "];";

const invalidExtraAttr =
  "const allIcons = [\n" +
  '  // <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="  require(\'${path}\')," foo="bar">\n' +
  "  // </hhh-glob-template>\n" +
  "];";

const invalidWrongAttr =
  "const allIcons = [\n" +
  '  // <hhh-glob-template foo="bar">\n' +
  "  // </hhh-glob-template>\n" +
  "];";

const invalidTemplateOnly =
  "const allIcons = [\n" +
  "  // <hhh-glob-template template=\"import ${pathWithoutExt} from '${path}';\">\n" +
  "  // </hhh-glob-template>\n" +
  "];";

const invalidNonexistentDir =
  "const allIcons = [\n" +
  '  // <hhh-glob-template dir="./glob-template.test/does-not-exist" glob="*.svg" template="  require(\'${path}\'),">\n' +
  "  // </hhh-glob-template>\n" +
  "];";

const invalidFileInsteadOfDir =
  "const allIcons = [\n" +
  '  // <hhh-glob-template dir="./glob-template.test/a.svg" glob="*.svg" template="  require(\'${path}\'),">\n' +
  "  // </hhh-glob-template>\n" +
  "];";

const validCodeObjectLiteral =
  "const iconMap = {\n" +
  '  // <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="  ${filenameWithoutExt}: require(\'${path}\'),">\n' +
  "  a: require('./glob-template.test/a.svg'),\n" +
  "  b: require('./glob-template.test/b.svg'),\n" +
  "  c: require('./glob-template.test/c.svg'),\n" +
  "// </hhh-glob-template>\n" +
  "};";

const validCodeObjectLiteralImports =
  "const icons = {\n" +
  '  // <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="  ${filenameWithoutExt}: () => import(\'${path}\'),">\n' +
  "  a: () => import('./glob-template.test/a.svg'),\n" +
  "  b: () => import('./glob-template.test/b.svg'),\n" +
  "  c: () => import('./glob-template.test/c.svg'),\n" +
  "// </hhh-glob-template>\n" +
  "};";

const validCodeTopLevelStatements =
  '// <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="const ${filenameWithoutExt} = require(\'${path}\');">\n' +
  "const a = require('./glob-template.test/a.svg');\n" +
  "const b = require('./glob-template.test/b.svg');\n" +
  "const c = require('./glob-template.test/c.svg');\n" +
  "// </hhh-glob-template>";

const validCodeShowingDifference =
  '// <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="  // File: ${filenameWithoutExt}">\n' +
  "  // File: a\n" +
  "  // File: b\n" +
  "  // File: c\n" +
  "// </hhh-glob-template>";

const simpleValidCode =
  "const allIcons = [\n" +
  '  // <hhh-glob-template dir="./glob-template.test" glob="*.svg" template="  require(\'${path}\'),">\n' +
  "  require('./glob-template.test/a.svg'),\n" +
  "  require('./glob-template.test/b.svg'),\n" +
  "  require('./glob-template.test/c.svg'),\n" +
  "// </hhh-glob-template>\n" +
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
  ],
  invalid: [
    {
      code: missingFileCode,
      filename: __filename,
      errors: [{ message: /Generated code is out of sync/ }],
      output: expectedOutput,
    },
    {
      code: missingFileCodeCustomTemplate,
      filename: __filename,
      errors: [{ message: /Generated code is out of sync/ }],
      output: expectedOutputCustomTemplate,
    },
    {
      code: missingFileObjectLiteral,
      filename: __filename,
      errors: [{ message: /Generated code is out of sync/ }],
      output: expectedOutputObjectLiteral,
    },
    {
      code: missingFileTopLevel,
      filename: __filename,
      errors: [{ message: /Generated code is out of sync/ }],
      output: expectedOutputTopLevel,
    },
    {
      code: extraFileCode,
      filename: __filename,
      errors: [{ message: /Generated code is out of sync/ }],
      output: expectedOutput,
    },
    {
      code: invalidNoDir,
      filename: __filename,
      errors: [{ message: /must have dir, glob, and template attributes/ }],
    },
    {
      code: invalidNoGlob,
      filename: __filename,
      errors: [{ message: /must have dir, glob, and template attributes/ }],
    },
    {
      code: invalidNoTemplate,
      filename: __filename,
      errors: [{ message: /must have dir, glob, and template attributes/ }],
    },
    {
      code: invalidTemplateOnly,
      filename: __filename,
      errors: [{ message: /must have dir, glob, and template attributes/ }],
    },
    {
      code: invalidExtraAttr,
      filename: __filename,
      errors: [{ message: /must have dir, glob, and template attributes/ }],
    },
    {
      code: invalidWrongAttr,
      filename: __filename,
      errors: [{ message: /must have dir, glob, and template attributes/ }],
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
