const { RuleTester } = require("eslint");
const rule = require("./nameof.cjs");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    parser: require("@typescript-eslint/parser"),
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  rules: {
    "rule-to-test/nameof": ["error"],
  },
});

ruleTester.run("nameof", rule, {
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
      // Function with underscores
      code: `'my_function_name' as NameOf<typeof my_function_name>`,
    },
    {
      // Class with numbers
      code: `'Class123' as NameOf<typeof Class123>`,
    },
    {
      // Variable with dollar sign
      code: `'$variable' as NameOf<typeof $variable>`,
    },
    {
      // Type name without typeof - interface
      code: `'MyInterface' as NameOf<MyInterface>`,
    },
    {
      // Type name without typeof - class
      code: `'UserClass' as NameOf<UserClass>`,
    },
    {
      // Type name without typeof - with numbers
      code: `'Type123' as NameOf<Type123>`,
    },
    {
      // Type name without typeof - with underscores
      code: `'My_Type_Name' as NameOf<My_Type_Name>`,
    },
    {
      // Template literal (backticks) with typeof
      code: `\`MyClass\` as NameOf<typeof MyClass>`,
    },
    {
      // Template literal (backticks) with type name
      code: `\`MyInterface\` as NameOf<MyInterface>`,
    },
    {
      // Single quotes
      code: `'MyFunction' as NameOf<typeof MyFunction>`,
    },
    {
      // Double quotes
      code: `"MyVariable" as NameOf<typeof MyVariable>`,
    },
    {
      // Template literal with simple string (no interpolation)
      code: `\`SimpleClass\` as NameOf<typeof SimpleClass>`,
    },
    {
      // Multiline generic type parameter with typeof
      code: `'MyClass' as NameOf<
  typeof MyClass
>`,
    },
    {
      // Multiline generic type parameter with type name
      code: `'MyInterface' as NameOf<
  MyInterface
>`,
    },
    {
      // Multiline with extra whitespace and indentation
      code: `'MyFunction' as NameOf<
    typeof    MyFunction   
  >`,
    },
    {
      // Complex multiline formatting
      code: `'ComplexClass' as NameOf<

      typeof
        ComplexClass

    >`,
    },
    {
      // Built-in types - valid when string matches
      code: `'number' as NameOf<number>`,
    },
    {
      // Built-in types - valid when string matches
      code: `'boolean' as NameOf<boolean>`,
    },
    {
      // Built-in types - valid when string matches
      code: `'string' as NameOf<string>`,
    },
    {
      // Not a NameOf type assertion - should be ignored
      code: `'WrongName' as SomeOtherType<typeof MyClass>`,
    },
    {
      // Type assertion without NameOf - should be ignored
      code: `'SomeString' as string`,
    },
    {
      // Non-string expression - should be ignored
      code: `123 as NameOf<typeof MyClass>`,
    },
    {
      // Template literal with expressions - should be ignored
      code: `\`\${someVar}\` as NameOf<typeof MyClass>`,
    },
    {
      // Template literal with multiple parts - should be ignored
      code: `\`prefix\${someVar}suffix\` as NameOf<typeof MyClass>`,
    },
    {
      // Using satisfies with typeof
      code: `'NewWordTutorial' satisfies NameOf<typeof NewWordTutorial>`,
    },
    {
      // Using satisfies with type name
      code: `'MyInterface' satisfies NameOf<MyInterface>`,
    },
    {
      // Using satisfies with double quotes
      code: `"MyClass" satisfies NameOf<typeof MyClass>`,
    },
    {
      // Using satisfies with template literal
      code: `\`MyFunction\` satisfies NameOf<typeof MyFunction>`,
    },
    {
      // Using satisfies with built-in types
      code: `'boolean' satisfies NameOf<boolean>`,
    },
    {
      // Using satisfies with multiline
      code: `'ComplexClass' satisfies NameOf<
  typeof ComplexClass
>`,
    },
  ],
  invalid: [
    {
      code: `'NewWordTutorial2' as NameOf<typeof NewWordTutorial>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "NewWordTutorial2",
            expected: "NewWordTutorial",
          },
        },
      ],
      output: `'NewWordTutorial' as NameOf<typeof NewWordTutorial>`,
    },
    {
      code: `'wrongName' as NameOf<typeof myFunction>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "wrongName",
            expected: "myFunction",
          },
        },
      ],
      output: `'myFunction' as NameOf<typeof myFunction>`,
    },
    {
      code: `const result = 'DifferentClass' as NameOf<typeof SomeClass>;`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "DifferentClass",
            expected: "SomeClass",
          },
        },
      ],
      output: `const result = 'SomeClass' as NameOf<typeof SomeClass>;`,
    },
    {
      code: `console.log('' as NameOf<typeof myVariable>);`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "",
            expected: "myVariable",
          },
        },
      ],
      output: `console.log('myVariable' as NameOf<typeof myVariable>);`,
    },
    {
      // Test with extra whitespace in generic
      code: `'WrongName' as NameOf< typeof  MyClass >`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongName",
            expected: "MyClass",
          },
        },
      ],
      output: `'MyClass' as NameOf< typeof  MyClass >`,
    },
    {
      // Test double quotes
      code: `"WrongName" as NameOf<typeof MyClass>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongName",
            expected: "MyClass",
          },
        },
      ],
      output: `"MyClass" as NameOf<typeof MyClass>`,
    },
    {
      // Test type name without typeof
      code: `'WrongName' as NameOf<MyInterface>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongName",
            expected: "MyInterface",
          },
        },
      ],
      output: `'MyInterface' as NameOf<MyInterface>`,
    },
    {
      // Test type name with empty string
      code: `'' as NameOf<UserType>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "",
            expected: "UserType",
          },
        },
      ],
      output: `'UserType' as NameOf<UserType>`,
    },
    {
      // Test type name with completely different string
      code: `const name = 'SomethingElse' as NameOf<PersonClass>;`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "SomethingElse",
            expected: "PersonClass",
          },
        },
      ],
      output: `const name = 'PersonClass' as NameOf<PersonClass>;`,
    },
    {
      // Test template literal (backticks) - should preserve backticks
      code: `\`WrongName\` as NameOf<typeof MyClass>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongName",
            expected: "MyClass",
          },
        },
      ],
      output: `\`MyClass\` as NameOf<typeof MyClass>`,
    },
    {
      // Test single quotes - should preserve single quotes
      code: `'WrongInterface' as NameOf<MyInterface>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongInterface",
            expected: "MyInterface",
          },
        },
      ],
      output: `'MyInterface' as NameOf<MyInterface>`,
    },
    {
      // Test double quotes - should preserve double quotes
      code: `"WrongUserType" as NameOf<UserType>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongUserType",
            expected: "UserType",
          },
        },
      ],
      output: `"UserType" as NameOf<UserType>`,
    },
    {
      // Test template literal with empty string
      code: `\`\` as NameOf<MyComponent>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "",
            expected: "MyComponent",
          },
        },
      ],
      output: `\`MyComponent\` as NameOf<MyComponent>`,
    },
    {
      // Test multiline generic type parameter with typeof
      code: `'WrongName' as NameOf<
  typeof MyClass
>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongName",
            expected: "MyClass",
          },
        },
      ],
      output: `'MyClass' as NameOf<
  typeof MyClass
>`,
    },
    {
      // Test multiline generic type parameter with type name
      code: `"WrongInterface" as NameOf<
  MyInterface
>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongInterface",
            expected: "MyInterface",
          },
        },
      ],
      output: `"MyInterface" as NameOf<
  MyInterface
>`,
    },
    {
      // Test multiline with extra whitespace and template literal
      code: `\`WrongFunction\` as NameOf<
    typeof    MyFunction   
  >`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongFunction",
            expected: "MyFunction",
          },
        },
      ],
      output: `\`MyFunction\` as NameOf<
    typeof    MyFunction   
  >`,
    },
    {
      // Test complex multiline formatting
      code: `'WrongComplexClass' as NameOf<

      typeof
        ComplexClass

    >`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongComplexClass",
            expected: "ComplexClass",
          },
        },
      ],
      output: `'ComplexClass' as NameOf<

      typeof
        ComplexClass

    >`,
    },
    {
      // Test built-in type with wrong string
      code: `'anything' as NameOf<boolean>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "anything",
            expected: "boolean",
          },
        },
      ],
      output: `'boolean' as NameOf<boolean>`,
    },
    {
      // Test built-in type number with wrong string
      code: `'WrongName' as NameOf<number>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongName",
            expected: "number",
          },
        },
      ],
      output: `'number' as NameOf<number>`,
    },
    {
      // Test built-in type string with wrong string
      code: `'SomeString' as NameOf<string>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "SomeString",
            expected: "string",
          },
        },
      ],
      output: `'string' as NameOf<string>`,
    },
    {
      // Test satisfies with wrong string
      code: `'WrongName' satisfies NameOf<typeof MyClass>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongName",
            expected: "MyClass",
          },
        },
      ],
      output: `'MyClass' satisfies NameOf<typeof MyClass>`,
    },
    {
      // Test satisfies with type name and wrong string
      code: `'WrongInterface' satisfies NameOf<MyInterface>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongInterface",
            expected: "MyInterface",
          },
        },
      ],
      output: `'MyInterface' satisfies NameOf<MyInterface>`,
    },
    {
      // Test satisfies with double quotes
      code: `"WrongClass" satisfies NameOf<typeof MyClass>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongClass",
            expected: "MyClass",
          },
        },
      ],
      output: `"MyClass" satisfies NameOf<typeof MyClass>`,
    },
    {
      // Test satisfies with template literal
      code: `\`WrongFunction\` satisfies NameOf<typeof MyFunction>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongFunction",
            expected: "MyFunction",
          },
        },
      ],
      output: `\`MyFunction\` satisfies NameOf<typeof MyFunction>`,
    },
    {
      // Test satisfies with built-in type
      code: `'anything' satisfies NameOf<boolean>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "anything",
            expected: "boolean",
          },
        },
      ],
      output: `'boolean' satisfies NameOf<boolean>`,
    },
    {
      // Test satisfies with multiline and wrong string
      code: `'WrongComplexClass' satisfies NameOf<
  typeof ComplexClass
>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "WrongComplexClass",
            expected: "ComplexClass",
          },
        },
      ],
      output: `'ComplexClass' satisfies NameOf<
  typeof ComplexClass
>`,
    },
    {
      // Test satisfies with empty string
      code: `'' satisfies NameOf<UserType>`,
      errors: [
        {
          messageId: "mismatch",
          data: {
            actual: "",
            expected: "UserType",
          },
        },
      ],
      output: `'UserType' satisfies NameOf<UserType>`,
    },
  ],
});
