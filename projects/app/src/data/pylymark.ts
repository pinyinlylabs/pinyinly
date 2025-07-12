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

export type PylymarkNode =
  | PylymarkHanziWordNode
  | PylymarkTextNode
  | PylymarkBoldNode
  | PylymarkItalicNode;

/**
 * Parse a Pylymark string into an array of nodes.
 *
 * Supported syntax:
 *
 * - Text: plain text
 * - HanziWord: {HanziWord} (e.g. {好:good})
 * - Bold: **text**
 * - Italic: *text*
 * - Single dumb apostrophe to smart quote: don't -> don’t
 * - Single quotes to smart quotes: 'text' -> ‘text’
 * - Double quotes to smart quotes: "text" -> “text”
 */
export function parsePylymark(value: string): PylymarkNode[] {
  const nodes: PylymarkNode[] = [];

  // Regex patterns for HanziWord, Bold, Italic, and smart quotes
  const regex =
    /{([^:]+):(-)?([^}]+)}|\*\*(.+?)\*\*|\*(.+?)\*|'([^']+)'|"([^"]+)"|(\b\w+)'(\w+)/g;
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
      singleQuoteText,
      doubleQuoteText,
      apostropheBeforeText,
      apostropheAfterText,
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
    } else if (singleQuoteText != null) {
      // Add or merge Text node with smart single quotes
      const text = `‘${singleQuoteText}’`;
      const lastNode = nodes.at(-1);
      if (lastNode?.type === `text`) {
        lastNode.text += text; // Merge with the last text node
      } else {
        nodes.push({
          type: `text`,
          text,
        });
      }
    } else if (doubleQuoteText != null) {
      // Add or merge Text node with smart double quotes
      const text = `“${doubleQuoteText}”`;
      const lastNode = nodes.at(-1);
      if (lastNode?.type === `text`) {
        lastNode.text += text; // Merge with the last text node
      } else {
        nodes.push({
          type: `text`,
          text,
        });
      }
    } else if (apostropheBeforeText != null && apostropheAfterText != null) {
      // Add or merge Text node with smart single quotes within words
      const singleQuoteTextNode = `${apostropheBeforeText}’${apostropheAfterText}`;
      const lastNode = nodes.at(-1);
      if (lastNode?.type === `text`) {
        lastNode.text += singleQuoteTextNode; // Merge with the last text node
      } else {
        nodes.push({
          type: `text`,
          text: singleQuoteTextNode,
        });
      }
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
      }
    })
    .join(``);
}
