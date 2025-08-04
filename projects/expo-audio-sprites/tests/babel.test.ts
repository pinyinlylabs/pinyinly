import audioSpriteBabelPreset from "#babel.ts";
import { transform } from "@babel/core";
import { describe, expect, test } from "vitest";

const transformCode = (code: string) => {
  const result = transform(code, {
    presets: [audioSpriteBabelPreset],
    filename: `test.js`,
  });
  return result?.code ?? ``;
};

describe(`Audio Sprite Babel Preset`, () => {
  test(`should transform .m4a require calls to audio sprite objects`, () => {
    const input = `const audio = require('./sounds/beep.m4a');`;

    const output = transformCode(input);

    expect(output).toMatchInlineSnapshot(`
      "const audio = {
        type: "audiosprite",
        start: 1.2,
        duration: 0.5,
        asset: require("./sounds/beep.m4a")
      };"
    `);
  });

  test(`should not create infinite recursion`, () => {
    const input = `const audio = require('./sounds/beep.m4a');`;

    // This should not hang or throw an error
    const output = transformCode(input);

    // Should only contain one require call (in the asset property)
    const requireMatches = output.match(/require\(/g);
    expect(requireMatches).toHaveLength(1);
  });

  test(`should ignore non-.m4a requires`, () => {
    const input = `const image = require('./assets/logo.png');`;

    const output = transformCode(input);

    // Should remain unchanged
    expect(output).toContain(`require('./assets/logo.png')`);
  });

  test(`should ignore require calls with multiple arguments`, () => {
    const input = `const something = require('./file.m4a', 'extra');`;

    const output = transformCode(input);

    // Should remain unchanged
    expect(output).toContain(`require('./file.m4a', 'extra')`);
  });

  test(`should ignore require calls with non-string arguments`, () => {
    const input = `const dynamic = require(variablePath);`;

    const output = transformCode(input);

    // Should remain unchanged
    expect(output).toContain(`require(variablePath)`);
  });

  test(`should ignore non-require function calls`, () => {
    const input = `const result = someFunction('./audio.m4a');`;

    const output = transformCode(input);

    // Should remain unchanged
    expect(output).toContain(`someFunction('./audio.m4a')`);
  });

  test(`should preserve original require for asset property`, () => {
    const input = `const audio = require('./sounds/beep.m4a');`;

    const output = transformCode(input);

    // The asset property should still contain the original require call
    expect(output).toContain(`asset: require("./sounds/beep.m4a")`);
  });

  test(`should handle multiple .m4a files in same code`, () => {
    const input = `
      const audio1 = require('./audio.m4a');
      const audio2 = require('../sounds/beep.m4a');
      const audio3 = require('../../assets/music.m4a');
    `;

    const output = transformCode(input);

    // All should be transformed to objects
    expect(output).toContain(`type: "audiosprite"`);
    expect(output).toContain(`asset: require("./audio.m4a")`);
    expect(output).toContain(`asset: require("../sounds/beep.m4a")`);
    expect(output).toContain(`asset: require("../../assets/music.m4a")`);

    // Should have 3 require calls (one for each asset property)
    const requireMatches = output.match(/require\(/g);
    expect(requireMatches).toHaveLength(3);
  });

  test(`should handle mixed content (m4a and non-m4a)`, () => {
    const input = `
      const audio = require('./sounds/beep.m4a');
      const image = require('./assets/logo.png');
      const video = require('./videos/intro.mp4');
    `;

    const output = transformCode(input);

    // Only .m4a should be transformed
    expect(output).toContain(`type: "audiosprite"`);
    expect(output).toContain(`asset: require("./sounds/beep.m4a")`);

    // Other files should remain unchanged
    expect(output).toContain(`require('./assets/logo.png')`);
    expect(output).toContain(`require('./videos/intro.mp4')`);

    // Should have 3 require calls total
    const requireMatches = output.match(/require\(/g);
    expect(requireMatches).toHaveLength(3);
  });
});
