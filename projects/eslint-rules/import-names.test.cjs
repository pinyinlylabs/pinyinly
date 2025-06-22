const { RuleTester } = require("eslint");
const rule = require("./import-names.cjs");
const parser = require("@typescript-eslint/parser");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
});

ruleTester.run("import-names", rule, {
  valid: [
    // No configuration - should not enforce anything without specific options
    {
      code: "import AnyName from 'any-module';\nconst something = AnyName.doSomething();",
    },
    {
      code: "import { something as anythingElse } from 'any-module';",
    },

    // Custom default import configuration
    {
      code: "import React from 'react';\nconst element = React.createElement('div');",
      options: [{ defaultImports: { react: "React" } }],
    },

    // Named import configuration
    {
      code: "import { useState } from 'react';\nconst [state, setState] = useState();",
      options: [{ namedImports: { react: { useState: "useState" } } }],
    },
    {
      code: "import { useState as useState } from 'react';\nconst [state, setState] = useState();",
      options: [{ namedImports: { react: { useState: "useState" } } }],
    },

    // Both default and named imports
    {
      code: "import React, { useState as useState } from 'react';\nconst element = React.createElement();\nconst [state, setState] = useState();",
      options: [
        {
          defaultImports: { react: "React" },
          namedImports: { react: { useState: "useState" } },
        },
      ],
    },

    // Namespace imports for modules without configuration should be allowed
    {
      code: "import * as lodash from 'lodash';\nconst result = lodash.map([1, 2, 3], x => x * 2);",
    },

    // Note: TypeScript type imports are also supported and follow the same naming rules
    {
      // Named type import
      code: "import type { Fragment } from 'react';",
      options: [{ namedImports: { react: { Fragment: "Fragment" } } }],
      languageOptions: { parser },
    },
    {
      // Default type import
      code: "import type React from 'react';",
      options: [{ defaultImports: { react: "React" } }],
      languageOptions: { parser },
    },
  ],

  invalid: [
    // Custom default import configuration
    {
      code: "import WrongName from 'react';\nconst element = WrongName.createElement('div');",
      options: [{ defaultImports: { react: "React" } }],
      errors: [
        {
          message: 'Default import from "react" must be named "React".',
        },
      ],
      output:
        "import React from 'react';\nconst element = React.createElement('div');",
    },

    // Named import configuration
    {
      code: "import { useState as wrongName } from 'react';\nconst [state, setState] = wrongName();",
      options: [{ namedImports: { react: { useState: "useState" } } }],
      errors: [
        {
          message:
            'Named import "useState" from "react" must be named "useState".',
        },
      ],
      output:
        "import { useState as useState } from 'react';\nconst [state, setState] = useState();",
    },

    // Namespace imports for modules with configuration should be disallowed
    {
      code: "import * as R from 'react';\nconst element = R.createElement('div');",
      options: [{ defaultImports: { react: "React" } }],
      errors: [
        {
          message:
            'Namespace import (import * as X) is not allowed for "react". Use specific named or default imports instead.',
        },
      ],
      // No output because we don't provide an auto-fix for this case
    },

    // Namespace imports for modules with named import configuration should also be disallowed
    {
      code: "import * as ReactHooks from 'react';\nconst [state, setState] = ReactHooks.useState();",
      options: [{ namedImports: { react: { useState: "useState" } } }],
      errors: [
        {
          message:
            'Namespace import (import * as X) is not allowed for "react". Use specific named or default imports instead.',
        },
      ],
      // No output because we don't provide an auto-fix for this case
    },

    // Wrong named type import
    {
      code: "import type { Fragment as CustomFragment } from 'react';",
      options: [{ namedImports: { react: { Fragment: "Fragment" } } }],
      languageOptions: { parser },
      errors: [
        {
          message:
            'Named import "Fragment" from "react" must be named "Fragment".',
        },
      ],
      output: "import type { Fragment as Fragment } from 'react';",
    },

    // Wrong default type import
    {
      code: "import type CustomReact from 'react';",
      options: [{ defaultImports: { react: "React" } }],
      languageOptions: { parser },
      errors: [
        {
          message: 'Default import from "react" must be named "React".',
        },
      ],
      output: "import type React from 'react';",
    },
  ],
});
