import { isLeafNode } from "@/data/hanzi";
import type {
  HanziCharacter,
  IdsNode,
  WikiCharacterComponent,
} from "@/data/model";

export function isRedundantSelfDecomposition({
  componentHanzi,
  childNode,
}: {
  componentHanzi: HanziCharacter | null;
  childNode: IdsNode<WikiCharacterComponent> | null;
}): boolean {
  if (componentHanzi == null || childNode == null) {
    return false;
  }

  if (!isLeafNode(childNode)) {
    return false;
  }

  return childNode.hanzi === componentHanzi;
}
