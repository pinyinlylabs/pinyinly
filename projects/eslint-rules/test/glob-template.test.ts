import { RuleTester } from "eslint";
import { globTemplate } from "../src/glob-template.js";

const validCodeCustomTemplate =
  `// <pyly-glob-template glob="./glob-template.test/*.svg" template="require('\${path}');">\n` +
  `require('./glob-template.test/a.svg');\n` +
  `require('./glob-template.test/b.svg');\n` +
  `require('./glob-template.test/c.svg');\n` +
  `// </pyly-glob-template>`;

const validCodeExtraWhitespace =
  `const allIcons = [\n` +
  `  // <pyly-glob-template   glob="./glob-template.test/*.svg"   template="  require('\${path}'),"   >\n` +
  `  require('./glob-template.test/a.svg'),\n` +
  `  require('./glob-template.test/b.svg'),\n` +
  `  require('./glob-template.test/c.svg'),\n` +
  `// </pyly-glob-template>\n` +
  `];`;

const validCodeParentDir =
  `const allIcons = [\n` +
  `  // <pyly-glob-template glob="../test/glob-template.test/*.svg" template="  require('\${path}'),">\n` +
  `  require('../test/glob-template.test/a.svg'),\n` +
  `  require('../test/glob-template.test/b.svg'),\n` +
  `  require('../test/glob-template.test/c.svg'),\n` +
  `// </pyly-glob-template>\n` +
  `];`;

const validCodeTwoParentDir =
  `const allIcons = [\n` +
  `  // <pyly-glob-template glob="../../eslint-rules/test/glob-template.test/*.svg" template="  require('\${path}'),">\n` +
  `  require('../../eslint-rules/test/glob-template.test/a.svg'),\n` +
  `  require('../../eslint-rules/test/glob-template.test/b.svg'),\n` +
  `  require('../../eslint-rules/test/glob-template.test/c.svg'),\n` +
  `// </pyly-glob-template>\n` +
  `];`;

const missingFileCode =
  `const allIcons = [\n` +
  `  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  require('\${path}'),">\n` +
  `  require('./glob-template.test/a.svg'),\n` +
  `  require('./glob-template.test/c.svg'),\n` +
  `// </pyly-glob-template>\n` +
  `];`;

const missingFileCodeCustomTemplate =
  `// <pyly-glob-template glob="./glob-template.test/*.svg" template="require('\${path}');">\n` +
  `require('./glob-template.test/a.svg');\n` +
  `require('./glob-template.test/c.svg');\n` +
  `// </pyly-glob-template>`;

const missingFileObjectLiteral =
  `const iconMap = {\n` +
  `  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  \${filenameWithoutExt}: require('\${path}'),">\n` +
  `  a: require('./glob-template.test/a.svg'),\n` +
  `  c: require('./glob-template.test/c.svg'),\n` +
  `// </pyly-glob-template>\n` +
  `};`;

const missingFileTopLevel =
  `// <pyly-glob-template glob="./glob-template.test/*.svg" template="const \${filenameWithoutExt} = require('\${path}');">\n` +
  `const a = require('./glob-template.test/a.svg');\n` +
  `const c = require('./glob-template.test/c.svg');\n` +
  `// </pyly-glob-template>`;

const extraFileCode =
  `const allIcons = [\n` +
  `  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  require('\${path}'),">\n` +
  `  require('./glob-template.test/a.svg'),\n` +
  `  require('./glob-template.test/b.svg'),\n` +
  `  require('./glob-template.test/c.svg'),\n` +
  `  require('./glob-template.test/d.svg'),\n` +
  `// </pyly-glob-template>\n` +
  `];`;

const expectedOutput =
  `const allIcons = [\n` +
  `  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  require('\${path}'),">\n` +
  `  require('./glob-template.test/a.svg'),\n` +
  `  require('./glob-template.test/b.svg'),\n` +
  `  require('./glob-template.test/c.svg'),\n` +
  `// </pyly-glob-template>\n` +
  `];`;

const expectedOutputCustomTemplate =
  `// <pyly-glob-template glob="./glob-template.test/*.svg" template="require('\${path}');">\n` +
  `require('./glob-template.test/a.svg');\n` +
  `require('./glob-template.test/b.svg');\n` +
  `require('./glob-template.test/c.svg');\n` +
  `// </pyly-glob-template>`;

const expectedOutputObjectLiteral =
  `const iconMap = {\n` +
  `  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  \${filenameWithoutExt}: require('\${path}'),">\n` +
  `  a: require('./glob-template.test/a.svg'),\n` +
  `  b: require('./glob-template.test/b.svg'),\n` +
  `  c: require('./glob-template.test/c.svg'),\n` +
  `// </pyly-glob-template>\n` +
  `};`;

const expectedOutputTopLevel =
  `// <pyly-glob-template glob="./glob-template.test/*.svg" template="const \${filenameWithoutExt} = require('\${path}');">\n` +
  `const a = require('./glob-template.test/a.svg');\n` +
  `const b = require('./glob-template.test/b.svg');\n` +
  `const c = require('./glob-template.test/c.svg');\n` +
  `// </pyly-glob-template>`;

const invalidNoGlob =
  `const allIcons = [\n` +
  `  // <pyly-glob-template template="  require('\${path}'),">\n` +
  `  // </pyly-glob-template>\n` +
  `];`;

const invalidNoTemplate =
  `const allIcons = [\n` +
  `  // <pyly-glob-template glob="./glob-template.test/*.svg">\n` +
  `  // </pyly-glob-template>\n` +
  `];`;

const invalidExtraAttr =
  `const allIcons = [\n` +
  `  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  require('\${path}')," foo="bar">\n` +
  `  // </pyly-glob-template>\n` +
  `];`;

const invalidWrongAttr =
  `const allIcons = [\n` +
  `  // <pyly-glob-template foo="bar">\n` +
  `  // </pyly-glob-template>\n` +
  `];`;

const invalidTemplateOnly =
  `const allIcons = [\n` +
  `  // <pyly-glob-template template="import \${pathWithoutExt} from '\${path}';">\n` +
  `  // </pyly-glob-template>\n` +
  `];`;

const invalidNonexistentDir =
  `const allIcons = [\n` +
  `  // <pyly-glob-template glob="./glob-template.test/does-not-exist/*.svg" template="  require('\${path}'),">\n` +
  `  // </pyly-glob-template>\n` +
  `];`;

const invalidFileInsteadOfDir =
  `const allIcons = [\n` +
  `  // <pyly-glob-template glob="./glob-template.test/a.svg/*.svg" template="  require('\${path}'),">\n` +
  `  // </pyly-glob-template>\n` +
  `];`;

const validCodeObjectLiteral =
  `const iconMap = {\n` +
  `  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  \${filenameWithoutExt}: require('\${path}'),">\n` +
  `  a: require('./glob-template.test/a.svg'),\n` +
  `  b: require('./glob-template.test/b.svg'),\n` +
  `  c: require('./glob-template.test/c.svg'),\n` +
  `// </pyly-glob-template>\n` +
  `};`;

const validCodeObjectLiteralImports =
  `const icons = {\n` +
  `  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  \${filenameWithoutExt}: () => import('\${path}'),">\n` +
  `  a: () => import('./glob-template.test/a.svg'),\n` +
  `  b: () => import('./glob-template.test/b.svg'),\n` +
  `  c: () => import('./glob-template.test/c.svg'),\n` +
  `// </pyly-glob-template>\n` +
  `};`;

const validCodeTopLevelStatements =
  `// <pyly-glob-template glob="./glob-template.test/*.svg" template="const \${filenameWithoutExt} = require('\${path}');">\n` +
  `const a = require('./glob-template.test/a.svg');\n` +
  `const b = require('./glob-template.test/b.svg');\n` +
  `const c = require('./glob-template.test/c.svg');\n` +
  `// </pyly-glob-template>`;

const validCodeShowingDifference =
  `// <pyly-glob-template glob="./glob-template.test/*.svg" template="  // File: \${filenameWithoutExt}">\n` +
  `  // File: a\n` +
  `  // File: b\n` +
  `  // File: c\n` +
  `// </pyly-glob-template>`;

const validCodeWithParentDir =
  `const iconsByDirectory = {\n` +
  `  // <pyly-glob-template glob="./glob-template.test/**/*.svg" template="  \\"\${parentDir}\\": require('\${path}'),">\n` +
  `  "glob-template.test": require('./glob-template.test/a.svg'),\n` +
  `  "glob-template.test": require('./glob-template.test/b.svg'),\n` +
  `  "glob-template.test": require('./glob-template.test/c.svg'),\n` +
  `  "nested": require('./glob-template.test/nested/d.svg'),\n` +
  `// </pyly-glob-template>\n` +
  `};`;

const validCodeWithParentDirAndFilenameWithoutExt =
  `const iconsByDirectory = {\n` +
  `  // <pyly-glob-template glob="./glob-template.test/**/*.svg" template="  \\"\${parentDir}\\": '\${filenameWithoutExt}',">\n` +
  `  "glob-template.test": 'a',\n` +
  `  "glob-template.test": 'b',\n` +
  `  "glob-template.test": 'c',\n` +
  `  "nested": 'd',\n` +
  `// </pyly-glob-template>\n` +
  `};`;

const validCodeWithRelPath =
  `const fileMapping = {\n` +
  `  // <pyly-glob-template glob="./glob-template.test/**/*.svg" template="  \\"\${path}\\": '\${relpath}',">\n` +
  `  "./glob-template.test/a.svg": 'a.svg',\n` +
  `  "./glob-template.test/b.svg": 'b.svg',\n` +
  `  "./glob-template.test/c.svg": 'c.svg',\n` +
  `  "./glob-template.test/nested/d.svg": 'nested/d.svg',\n` +
  `// </pyly-glob-template>\n` +
  `};`;

const validCodeWithRelPathWithoutExt =
  `const importMapping = {\n` +
  `  // <pyly-glob-template glob="./glob-template.test/**/*.svg" template="  \\"\${relpath}\\": '\${relpathWithoutExt}',">\n` +
  `  "a.svg": 'a',\n` +
  `  "b.svg": 'b',\n` +
  `  "c.svg": 'c',\n` +
  `  "nested/d.svg": 'nested/d',\n` +
  `// </pyly-glob-template>\n` +
  `};`;

const validCodeWithJsExpression =
  `const codeMapping = {\n` +
  `  // <pyly-glob-template glob="./glob-template.test/**/*.svg" template="  \\"\${relpath}\\": '\${relpath.split(\\".\\")[0].toUpperCase()}',">\n` +
  `  "a.svg": 'A',\n` +
  `  "b.svg": 'B',\n` +
  `  "c.svg": 'C',\n` +
  `  "nested/d.svg": 'NESTED/D',\n` +
  `// </pyly-glob-template>\n` +
  `};`;

const simpleValidCode =
  `const allIcons = [\n` +
  `  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  require('\${path}'),">\n` +
  `  require('./glob-template.test/a.svg'),\n` +
  `  require('./glob-template.test/b.svg'),\n` +
  `  require('./glob-template.test/c.svg'),\n` +
  `// </pyly-glob-template>\n` +
  `];`;

const validCodeWithQuotesInTemplate =
  `const allIcons = [\n` +
  `  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  {\\"name\\": \\"\${filenameWithoutExt}\\", path: \\"\${path}\\"},">\n` +
  `  {"name": "a", path: "./glob-template.test/a.svg"},\n` +
  `  {"name": "b", path: "./glob-template.test/b.svg"},\n` +
  `  {"name": "c", path: "./glob-template.test/c.svg"},\n` +
  `// </pyly-glob-template>\n` +
  `];`;

const missingFileWithQuotesInTemplate =
  `const allIcons = [\n` +
  `  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  {\\"name\\": \\"\${filenameWithoutExt}\\", path: \\"\${path}\\"},">\n` +
  `  {"name": "a", path: "./glob-template.test/a.svg"},\n` +
  `  {"name": "c", path: "./glob-template.test/c.svg"},\n` +
  `// </pyly-glob-template>\n` +
  `];`;

const expectedOutputWithQuotesInTemplate =
  `const allIcons = [\n` +
  `  // <pyly-glob-template glob="./glob-template.test/*.svg" template="  {\\"name\\": \\"\${filenameWithoutExt}\\", path: \\"\${path}\\"},">\n` +
  `  {"name": "a", path: "./glob-template.test/a.svg"},\n` +
  `  {"name": "b", path: "./glob-template.test/b.svg"},\n` +
  `  {"name": "c", path: "./glob-template.test/c.svg"},\n` +
  `// </pyly-glob-template>\n` +
  `];`;

const filename = import.meta.url.replace(`file://`, ``);

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: `module`,
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  rules: {
    [`rule-to-test/glob-template`]: [`error`],
  },
});

ruleTester.run(`glob-template`, globTemplate, {
  valid: [
    {
      code: simpleValidCode,
      filename,
    },
    {
      code: validCodeCustomTemplate,
      filename,
    },
    {
      code: validCodeExtraWhitespace,
      filename,
    },
    {
      code: validCodeParentDir,
      filename,
    },
    {
      code: validCodeTwoParentDir,
      filename,
    },
    {
      code: validCodeObjectLiteral,
      filename,
    },
    {
      code: validCodeObjectLiteralImports,
      filename,
    },
    {
      code: validCodeTopLevelStatements,
      filename,
    },
    {
      code: validCodeShowingDifference,
      filename,
    },
    {
      code: validCodeWithQuotesInTemplate,
      filename,
    },
    {
      code: validCodeWithParentDir,
      filename,
    },
    {
      code: validCodeWithParentDirAndFilenameWithoutExt,
      filename,
    },
    {
      code: validCodeWithRelPath,
      filename,
    },
    {
      code: validCodeWithRelPathWithoutExt,
      filename,
    },
    {
      code: validCodeWithJsExpression,
      filename,
    },
  ],
  invalid: [
    {
      code: missingFileCode,
      filename,
      errors: [
        { message: /Generated code is out of sync with files matching/ },
      ],
      output: expectedOutput,
    },
    {
      code: missingFileCodeCustomTemplate,
      filename,
      errors: [
        { message: /Generated code is out of sync with files matching/ },
      ],
      output: expectedOutputCustomTemplate,
    },
    {
      code: missingFileObjectLiteral,
      filename,
      errors: [
        { message: /Generated code is out of sync with files matching/ },
      ],
      output: expectedOutputObjectLiteral,
    },
    {
      code: missingFileTopLevel,
      filename,
      errors: [
        { message: /Generated code is out of sync with files matching/ },
      ],
      output: expectedOutputTopLevel,
    },
    {
      code: extraFileCode,
      filename,
      errors: [
        { message: /Generated code is out of sync with files matching/ },
      ],
      output: expectedOutput,
    },
    {
      code: missingFileWithQuotesInTemplate,
      filename,
      errors: [
        { message: /Generated code is out of sync with files matching/ },
      ],
      output: expectedOutputWithQuotesInTemplate,
    },
    {
      code: invalidNoGlob,
      filename,
      errors: [{ message: /must have glob and template attributes/ }],
    },
    {
      code: invalidNoTemplate,
      filename,
      errors: [{ message: /must have glob and template attributes/ }],
    },
    {
      code: invalidTemplateOnly,
      filename,
      errors: [{ message: /must have glob and template attributes/ }],
    },
    {
      code: invalidExtraAttr,
      filename,
      errors: [{ message: /must have glob and template attributes/ }],
    },
    {
      code: invalidWrongAttr,
      filename,
      errors: [{ message: /must have glob and template attributes/ }],
    },
    {
      code: invalidNonexistentDir,
      filename,
      errors: [{ message: /Could not process glob pattern/ }],
    },
    {
      code: invalidFileInsteadOfDir,
      filename,
      errors: [{ message: /Could not process glob pattern/ }],
    },
  ],
});
