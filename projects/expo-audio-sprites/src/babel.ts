import type { PluginItem } from "@babel/core";
import { types as t } from "@babel/core";

// eslint-disable-next-line import/no-default-export
export default function expoAudioSpritesPreset() {
  return {
    plugins: [audioAssetPlugin],
  };
}

const audioAssetPlugin = (): PluginItem => {
  return {
    name: `@pinyinly/audio-sprites`,
    visitor: {
      CallExpression(path) {
        const { node } = path;

        // Only transform require() calls
        if (!t.isIdentifier(node.callee, { name: `require` })) {
          return;
        }

        // Only transform if there's exactly one string argument
        if (
          node.arguments.length !== 1 ||
          !t.isStringLiteral(node.arguments[0])
        ) {
          return;
        }

        const requirePath = node.arguments[0].value;

        // Only transform .m4a files
        if (!requirePath.endsWith(`.m4a`)) {
          return;
        }

        // Prevent infinite recursion: check if this require() is already inside an audio sprite object
        // We do this by checking if the parent is an ObjectProperty with key "asset"
        if (
          t.isObjectProperty(path.parent) &&
          t.isIdentifier(path.parent.key, { name: `asset` })
        ) {
          return;
        }

        // Create the transformed AST
        // Transform: require('./audio.m4a')
        // To: { type: "audiosprite", start: 1.2, duration: 0.5, asset: require('./audio.m4a') }
        const transformedNode = t.objectExpression([
          t.objectProperty(
            t.identifier(`type`),
            t.stringLiteral(`audiosprite`),
          ),
          t.objectProperty(t.identifier(`start`), t.numericLiteral(1.2)),
          t.objectProperty(t.identifier(`duration`), t.numericLiteral(0.5)),
          t.objectProperty(
            t.identifier(`asset`),
            t.callExpression(t.identifier(`require`), [
              t.stringLiteral(requirePath),
            ]),
          ),
        ]);

        // Replace the original require() call with our transformed object
        path.replaceWith(transformedNode);
      },
    },
  };
};
