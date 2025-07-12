module.exports = {
  rules: {
    ["import-names"]: require("./import-names.cjs"),
    ["import-path-rewrite"]: require("./import-path-rewrite.cjs"),
    ["nameof"]: require("./nameof.cjs"),
    ["no-restricted-css-classes"]: require("./no-restricted-css-classes.cjs"),
    ["glob-template"]: require("./glob-template.cjs"),
  },
};
