import { PluginItem, types as t } from "@babel/core";

export default function () {
  return {
    plugins: [audioAssetPlugin],
  };
}

const audioAssetPlugin = (): PluginItem => {
  return {
    name: `@pinyinly/audio-sprites`,
    visitor: {
      /**
       * Transform CallExpression nodes (like require() calls)
       * @param {BabelPath} path - Babel path object
       * @param {BabelState} state - Babel state object
       */
      CallExpression(path, state) {
        state;
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

        const requirePath = (node.arguments[0] as t.StringLiteral).value;

        // Only transform .m4a files
        if (!requirePath.endsWith(`.m4a`)) {
          return;
        }

        console.log(`found require() for audio sprite: ${requirePath}`);

        return;

        // // Resolve the full path relative to the current file
        // const currentFilePath = state.filename || ``;
        // const fullPath = nodePath.resolve(
        //   nodePath.dirname(currentFilePath),
        //   requirePath,
        // );
        // const baseName = nodePath.basename(fullPath, `.m4a`);

        // // Get sprite data
        // const spriteData = getSpriteDataForFile(fullPath, baseName);

        // // Create the transformed AST
        // // Transform: require('./audio.m4a')
        // // To: { start: 1.2, duration: 0.5, asset: require('./audio.m4a') }
        // const transformedNode = t.objectExpression([
        //   t.objectProperty(
        //     t.identifier(`start`),
        //     t.numericLiteral(spriteData.start),
        //   ),
        //   t.objectProperty(
        //     t.identifier(`duration`),
        //     t.numericLiteral(spriteData.duration),
        //   ),
        //   t.objectProperty(
        //     t.identifier(`asset`),
        //     t.callExpression(t.identifier(`require`), [
        //       t.stringLiteral(requirePath),
        //     ]),
        //   ),
        // ]);

        // // Replace the original require() call with our transformed object
        // path.replaceWith(transformedNode);

        // // Add a comment for debugging in development
        // if (process.env.NODE_ENV === `development`) {
        //   t.addComment(
        //     transformedNode,
        //     `leading`,
        //     ` Audio sprite: ${baseName} (start: ${spriteData.start}s, duration: ${spriteData.duration}s) `,
        //   );
        // }
      },
    },
  };
};
