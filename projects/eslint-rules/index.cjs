const noRestrictedClasses = require("./no-restricted-css-classes.cjs");
const reanimatedDefaultName = require("./reanimated-default-name.cjs");
const requireGlob = require("./require-glob.cjs");

module.exports = {
  rules: {
    "no-restricted-css-classes": noRestrictedClasses,
    "reanimated-default-name": reanimatedDefaultName,
    "require-glob": requireGlob,
  },
};
