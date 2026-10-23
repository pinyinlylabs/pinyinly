import { assert } from "vitest";
import { cdp } from "vitest/browser";
import type {} from "@vitest/browser-playwright";

/**
 * Forces CSS pseudo-classes on an element found by test ID in Vitest's browser
 * test iframe.
 */
export async function forcePseudoStateByTestId(
  testID: string,
  states: string[],
) {
  const session = cdp();
  await session.send(`DOM.enable`);
  await session.send(`CSS.enable`);

  const { root } = await session.send(`DOM.getDocument`);
  const { nodeId: frameNodeId } = await session.send(`DOM.querySelector`, {
    nodeId: root.nodeId,
    selector: `iframe`,
  });
  assert(frameNodeId !== 0);
  const { node: frameNode } = await session.send(`DOM.describeNode`, {
    nodeId: frameNodeId,
    depth: -1,
    pierce: true,
  });
  assert(frameNode.contentDocument?.backendNodeId != null);
  const { nodeIds } = await session.send(
    `DOM.pushNodesByBackendIdsToFrontend`,
    { backendNodeIds: [frameNode.contentDocument.backendNodeId] },
  );
  const contentDocumentNodeId = nodeIds[0];
  assert(contentDocumentNodeId != null && contentDocumentNodeId !== 0);
  const selector = `[data-testid="${CSS.escape(testID)}"]`;
  const { nodeId } = await session.send(`DOM.querySelector`, {
    nodeId: contentDocumentNodeId,
    selector,
  });
  assert(nodeId !== 0);
  await session.send(`CSS.forcePseudoState`, {
    nodeId,
    forcedPseudoClasses: states,
  });
}
