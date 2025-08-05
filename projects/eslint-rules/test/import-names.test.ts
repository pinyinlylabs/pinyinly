import * as typescriptParser from "@typescript-eslint/parser";
import { RuleTester } from "eslint";
import { importNames as rule } from "../src/import-names.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: `module`,
    parser: typescriptParser,
  },
});

ruleTester.run(`import-names`, rule, {
  valid: [
    // No configuration - should not enforce anything without specific options
    {
      code: `import AnyName from 'any-module';\nconst something = AnyName.doSomething();`,
    },
    {
      code: `import { something as anythingElse } from 'any-module';`,
    },

    // Custom default import configuration
    {
      code: `import React from 'react';\nconst element = React.createElement('div');`,
      options: [{ defaultImports: { react: `React` } }],
    },

    // Named import configuration
    {
      code: `import { useState } from 'react';\nconst [state, setState] = useState();`,
      options: [{ namedImports: { react: { useState: `useState` } } }],
    },
    {
      code: `import { useState as useState } from 'react';\nconst [state, setState] = useState();`,
      options: [{ namedImports: { react: { useState: `useState` } } }],
    },

    // Both default and named imports
    {
      code: `import React, { useState as useState } from 'react';\nconst element = React.createElement();\nconst [state, setState] = useState();`,
      options: [
        {
          defaultImports: { react: `React` },
          namedImports: { react: { useState: `useState` } },
        },
      ],
    },

    // Namespace imports for modules without configuration should be allowed
    {
      code: `import * as something from 'any-module';\nconst result = something.doSomething();`,
    },

    // TypeScript type imports
    {
      code: `import type { SomeType } from 'some-module';`,
    },
  ],

  invalid: [
    // Default import with wrong name
    {
      code: `import MyReact from 'react';\nconst element = MyReact.createElement('div');`,
      options: [{ defaultImports: { react: `React` } }],
      errors: [
        {
          message: `Default import from "react" must be named "React".`,
          type: `ImportDefaultSpecifier`,
        },
      ],
      output: `import React from 'react';\nconst element = React.createElement('div');`,
    },

    // Named import with wrong name
    {
      code: `import { useState as useStateAlias } from 'react';\nconst [state, setState] = useStateAlias();`,
      options: [{ namedImports: { react: { useState: `useState` } } }],
      errors: [
        {
          message: `Named import "useState" from "react" must be named "useState".`,
          type: `ImportSpecifier`,
        },
      ],
      output: `import { useState as useState } from 'react';\nconst [state, setState] = useState();`,
    },

    // Namespace import when naming is configured (should not be allowed)
    {
      code: `import * as React from 'react';\nconst element = React.createElement('div');`,
      options: [{ defaultImports: { react: `React` } }],
      errors: [
        {
          message: `Namespace import (import * as X) is not allowed for "react". Use specific named or default imports instead.`,
          type: `ImportNamespaceSpecifier`,
        },
      ],
    },

    // Multiple violations - test may require multiple lint passes to fully fix
    {
      code: `import MyReact, { useState as useStateAlias } from 'react';\nconst element = MyReact.createElement();\nconst [state, setState] = useStateAlias();`,
      options: [
        {
          defaultImports: { react: `React` },
          namedImports: { react: { useState: `useState` } },
        },
      ],
      errors: [
        {
          message: `Default import from "react" must be named "React".`,
          type: `ImportDefaultSpecifier`,
        },
        {
          message: `Named import "useState" from "react" must be named "useState".`,
          type: `ImportSpecifier`,
        },
      ],
      output: `import React, { useState as useStateAlias } from 'react';\nconst element = React.createElement();\nconst [state, setState] = useStateAlias();`,
    },
  ],
});
