module.exports = {
  rules: {
    "no-restricted-css-classes": require("./no-restricted-css-classes.cjs"),
    "import-names": require("./import-names.cjs"),
    "import-path-rewrite": require("./import-path-rewrite.cjs"),
    "require-glob": require("./require-glob.cjs"),
  },
};
