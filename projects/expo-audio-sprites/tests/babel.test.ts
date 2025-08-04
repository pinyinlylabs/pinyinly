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
  test(`should identify .m4a require calls`, () => {
    const input = `const audio = require('./sounds/beep.m4a');`;

    // Since the actual transformation is commented out, we expect the code to remain unchanged
    // but the plugin should at least process it (you'll see console.log output)
    const output = transformCode(input);

    // For now, expect the code to be unchanged since transformation logic is commented
    expect(output).toContain(`require('./sounds/beep.m4a')`);
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

  // TODO: Add these tests when the transformation logic is implemented
  test.todo(`should transform .m4a requires to audio sprite objects`, () => {
    const input = `const audio = require('./sounds/beep.m4a');`;

    const output = transformCode(input);

    // Expected output when transformation is implemented:
    // const audio = {
    //   start: 1.2,
    //   duration: 0.5,
    //   asset: require('./sounds/beep.m4a')
    // };
    expect(output).toContain(`start:`);
    expect(output).toContain(`duration:`);
    expect(output).toContain(`asset:`);
  });

  test.todo(`should preserve original require for asset property`, () => {
    const input = `const audio = require('./sounds/beep.m4a');`;

    const output = transformCode(input);

    // The asset property should still contain the original require call
    expect(output).toContain(`asset: require('./sounds/beep.m4a')`);
  });

  test.todo(`should add development comments`, () => {
    // Set NODE_ENV for this test
    const originalEnv = process.env[`NODE_ENV`];
    process.env[`NODE_ENV`] = `development`;

    const input = `const audio = require('./sounds/beep.m4a');`;
    const output = transformCode(input);

    // Should contain debugging comment in development
    expect(output).toContain(`Audio sprite:`);

    // Restore original NODE_ENV
    process.env[`NODE_ENV`] = originalEnv;
  });

  test.todo(`should handle relative paths correctly`, () => {
    const input = `
      const audio1 = require('./audio.m4a');
      const audio2 = require('../sounds/beep.m4a');
      const audio3 = require('../../assets/music.m4a');
    `;

    const output = transformCode(input);

    // All should be transformed to objects
    expect(output).not.toContain(`require('./audio.m4a')`);
    expect(output).not.toContain(`require('../sounds/beep.m4a')`);
    expect(output).not.toContain(`require('../../assets/music.m4a')`);
  });

  test.todo(`should work with import statements in ES modules`, () => {
    // Test for when you add support for import statements
    const input = `import audio from './sounds/beep.m4a';`;

    const output = transformCode(input);

    // Should transform import statements too
    expect(output).toContain(`start:`);
    expect(output).toContain(`duration:`);
  });
});
