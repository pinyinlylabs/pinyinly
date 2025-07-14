import {
  buildHanziWord,
  hanziFromHanziWord,
  meaningKeyFromHanziWord,
} from "@/dictionary/dictionary";
import type { HanziWord } from "./model";

export interface PylymarkHanziWordNode {
  type: `hanziWord`;
  hanziWord: HanziWord;
  showGloss: boolean;
}

export interface PylymarkTextNode {
  type: `text`;
  text: string;
}

export interface PylymarkBoldNode {
  type: `bold`;
  text: string;
}

export interface PylymarkItalicNode {
  type: `italic`;
  text: string;
}

export interface PylymarkHighlightNode {
  type: `highlight`;
  text: string;
}

export type PylymarkNode =
  | PylymarkHanziWordNode
  | PylymarkTextNode
  | PylymarkBoldNode
  | PylymarkItalicNode
  | PylymarkHighlightNode;

/**
 * Parse a Pylymark string into an array of nodes.
 *
 * Supported syntax:
 *
 * - Text: plain text
 * - HanziWord: {HanziWord} (e.g. {好:good})
 * - Bold: **text**
 * - Italic: *text*
 * - Highlight: ==text==
 */
export function parsePylymark(value: string): PylymarkNode[] {
  const nodes: PylymarkNode[] = [];

  // Regex patterns for HanziWord, Bold, Italic, and Highlight
  const regex = /{([^:]+):(-)?([^}]+)}|\*\*(.+?)\*\*|\*(.+?)\*|==(.+?)==/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(value)) !== null) {
    const [
      _fullMatch,
      hanziWordHanzi,
      hanziWordHideGloss,
      hanziWordMeaningKey,
      boldText,
      italicText,
      highlightText,
    ] = match;
    const startIndex = match.index;
    const endIndex = regex.lastIndex;

    // Add or merge text node for the text before the match
    if (startIndex > lastIndex) {
      const text = value.slice(lastIndex, startIndex);
      const lastNode = nodes.at(-1);
      if (lastNode?.type === `text`) {
        lastNode.text += text; // Merge with the last text node
      } else {
        nodes.push({
          type: `text`,
          text,
        });
      }
    }

    if (hanziWordHanzi != null && hanziWordMeaningKey != null) {
      // Add HanziWord node for the match
      nodes.push({
        type: `hanziWord`,
        hanziWord: buildHanziWord(hanziWordHanzi, hanziWordMeaningKey),
        showGloss: hanziWordHideGloss != `-`,
      });
    } else if (boldText != null) {
      // Add Bold node for the match
      nodes.push({
        type: `bold`,
        text: boldText,
      });
    } else if (italicText != null) {
      // Add Italic node for the match
      nodes.push({
        type: `italic`,
        text: italicText,
      });
    } else if (highlightText != null) {
      // Add Highlight node for the match
      nodes.push({
        type: `highlight`,
        text: highlightText,
      });
    }

    lastIndex = endIndex;
  }

  // Add or merge text node for the remaining text after the last match
  if (lastIndex < value.length) {
    const text = value.slice(lastIndex);
    const lastNode = nodes.at(-1);
    if (lastNode?.type === `text`) {
      lastNode.text += text; // Merge with the last text node
    } else {
      nodes.push({
        type: `text`,
        text,
      });
    }
  }

  return nodes;
}

export function stringifyPylymark(nodes: PylymarkNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case `text`: {
          return node.text;
        }
        case `hanziWord`: {
          return `{${hanziFromHanziWord(node.hanziWord)}:${node.showGloss ? `` : `-`}${meaningKeyFromHanziWord(node.hanziWord)}}`;
        }
        case `bold`: {
          return `**${node.text}**`;
        }
        case `italic`: {
          return `*${node.text}*`;
        }
        case `highlight`: {
          return `==${node.text}==`;
        }
      }
    })
    .join(``);
}
