const { RuleTester } = require("eslint");
const rule = require("./reanimated-default-name.cjs");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
});

ruleTester.run("reanimated-default-name", rule, {
  valid: [
    {
      code: "import Reanimated from 'react-native-reanimated';\nconst animation = Reanimated.timing();",
    },
    {
      code: "import { something } from 'react-native-reanimated';",
    },
    {
      code: "import Reanimated from 'react-native-reanimated';\nuseAnimatedReaction(() => {}, () => {});",
    },
  ],

  invalid: [
    {
      code: "import NotReanimated from 'react-native-reanimated';\nconst animation = NotReanimated.timing();",
      errors: [
        {
          message:
            'Default import from "react-native-reanimated" must be named "Reanimated".',
        },
      ],
      output:
        "import Reanimated from 'react-native-reanimated';\nconst animation = Reanimated.timing();",
    },
    {
      code: "import NotReanimated from 'react-native-reanimated';\nuseAnimatedReaction(() => {}, () => {});",
      errors: [
        {
          message:
            'Default import from "react-native-reanimated" must be named "Reanimated".',
        },
      ],
      output:
        "import Reanimated from 'react-native-reanimated';\nuseAnimatedReaction(() => {}, () => {});",
    },
  ],
});
