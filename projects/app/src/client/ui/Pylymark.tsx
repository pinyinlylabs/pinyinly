import type { PylymarkTokenNode } from "@/data/pylymark";
import { parsePylymark } from "@/data/pylymark";
import { useMemo } from "react";
import { Text } from "react-native";
import { HanziWordRefText } from "./HanziWordRefText";
import { pinyinSoundIdSchema } from "@/data/model";
import type { HanziText, PinyinSoundId } from "@/data/model";
import { Link } from "expo-router";
import { loadPylyPinyinChart } from "@/data/pinyin";

export type PylymarkHighlightToken = PinyinSoundId | HanziText;

export const Pylymark = ({
  source,
  highlightToken,
}: {
  source: string;
  /**
   * The token to highlight. If provided, the token will be highlighted in the
   * rendered output rather than being rendered as a component. For example in a
   * mnemonic sentence, the token may be highlighted to indicate that it is the
   * token being learned. This is useful for mnemonic sentences where the token
   * is being learned and should be highlighted in the sentence.
   */
  highlightToken?: PylymarkHighlightToken;
}) => {
  const rendered = useMemo(() => {
    const parsed = parsePylymark(source);
    return (
      <Text className="whitespace-pre-wrap tab-size-2">
        {parsed.map((node, index) => {
          switch (node.type) {
            case `text`: {
              return <Text key={index}>{node.text}</Text>;
            }
            case `hanziWord`: {
              return (
                <HanziWordRefText
                  key={index}
                  hanziWord={node.hanziWord}
                  gloss={node.showGloss}
                />
              );
            }
            case `bold`: {
              return (
                <Text key={index} className="pyly-bold">
                  {node.text}
                </Text>
              );
            }
            case `italic`: {
              return (
                <Text key={index} className="pyly-italic">
                  {node.text}
                </Text>
              );
            }
            case `mark`: {
              return (
                <Text key={index} className="pyly-mark">
                  {node.text}
                </Text>
              );
            }
            case `token`: {
              return (
                <PylymarkTokenText
                  key={index}
                  token={node}
                  highlightToken={highlightToken}
                />
              );
            }
          }
        })}
      </Text>
    );
  }, [highlightToken, source]);

  return rendered;
};

export const PylymarkTokenText = ({
  token,
  highlightToken,
}: {
  token: PylymarkTokenNode;
  highlightToken?: PylymarkHighlightToken;
}) => {
  const chart = loadPylyPinyinChart();
  const soundId = pinyinSoundIdSchema.safeParse(token.ref).data;
  const isHighlighted = token.ref === highlightToken;

  if (soundId != null) {
    const label = chart.soundToCustomLabel[soundId] ?? soundId;

    return (
      <Link
        href={`/sounds/${token.ref}`}
        className={`
          pyly-token

          ${isHighlighted ? `pyly-token-highlighted` : ``}
        `}
      >
        <Text
          // Don't let the label split across multiple lines, e.g.
          //
          //  …getting fussed over at the [-
          //  an] pyramid purification…
          //
          className="text-nowrap"
        >
          [{label}]
        </Text>{" "}
        {token.text}
      </Link>
    );
  }

  return (
    <Link
      href={`/wiki/${token.ref}`}
      className={`
        pyly-token

        ${isHighlighted ? `pyly-token-highlighted` : ``}
      `}
    >
      {token.ref} {token.text}
    </Link>
  );
};
