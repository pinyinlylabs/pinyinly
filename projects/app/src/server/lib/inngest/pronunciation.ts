import {
  glossOrThrow,
  hanziFromHanziWord,
  loadDictionary,
  oneUnitPinyinOrNull,
} from "@/dictionary";
import { withDrizzle } from "@/server/lib/db";
import { inngest, pronunciationGenerateHintEvent } from "./client";
import type { PinyinSoundId } from "@/data/model";
import { splitPinyinUnitOrThrow } from "@/data/pinyin";
import { getActorSpec, getLocationSpec } from "@/server/lib/query";
import { buildPronunciationHintRecurringPrompt } from "@/util/prompts/pronunciationHintRecurring";
import { invariant } from "@pinyinly/lib/invariant";
import { requestOpenAiResponseJson } from "@/server/lib/ai";
import { buildPylymarkTokenizePrompt } from "@/util/prompts/pylymarkTokenize";

function normalizeTerms(terms: readonly string[]): string[] {
  return [
    ...new Set(
      terms.map((term) => term.trim()).filter((term) => term.length > 0),
    ),
  ];
}

export const generatePronunciationRecurringHint = inngest.createFunction(
  {
    id: `pronunciation/generateRecurringHint`,
    triggers: [pronunciationGenerateHintEvent],
  },
  async ({ event }) => {
    const {
      userId,
      actorId,
      hanziWord,
      locationId,
      setKey,
      associationStrategy,
    } = event.data;

    const dictionary = await loadDictionary();
    const meaning = dictionary.lookupHanziWord(hanziWord);
    invariant(
      meaning != null,
      `Dictionary meaning not found for hanziWord: ${hanziWord}`,
    );

    const pinyinUnit = oneUnitPinyinOrNull(meaning);
    invariant(
      pinyinUnit != null,
      `Expected single-unit pronunciation for hanziWord: ${hanziWord}`,
    );

    const splitPinyin = splitPinyinUnitOrThrow(pinyinUnit);
    invariant(
      splitPinyin.toneSoundId === (setKeyToToneSoundId[setKey] ?? null),
      `Set key ${setKey} does not match tone ${splitPinyin.toneSoundId} for ${hanziWord}`,
    );

    const cueTerms = normalizeTerms(meaning.gloss);
    const cue = {
      label: glossOrThrow(hanziWord, meaning),
      ...(cueTerms.length <= 1 ? {} : { meaning: cueTerms.join(`; `) }),
    };

    const actorSpec = await withDrizzle(async (db) => {
      return getActorSpec(db, userId, actorId);
    });

    invariant(
      actorSpec != null,
      `Actor spec not found for actorId: ${actorId}`,
    );

    const locationSpec = await withDrizzle(async (db) => {
      return getLocationSpec(db, userId, locationId);
    });

    invariant(
      locationSpec != null,
      `Location spec not found for locationId: ${locationId}`,
    );

    const locationSetSpec = locationSpec.sets?.[setKey];
    invariant(locationSetSpec != null, `Set not found for setKey: ${setKey}`);

    const prompt = buildPronunciationHintRecurringPrompt({
      actor: actorSpec,
      cue,
      location: locationSpec,
      set: locationSetSpec,
      associationStrategy,
    });

    const { data: response } = await requestOpenAiResponseJson(prompt);

    const references = [
      {
        reference: splitPinyin.initialSoundId,
        terms: [actorSpec.nickname],
      },
      {
        reference: splitPinyin.finalSoundId,
        terms: [locationSpec.location],
      },
      {
        reference: splitPinyin.toneSoundId,
        terms: [locationSetSpec.name],
      },
      {
        reference: hanziFromHanziWord(hanziWord),
        terms: [cue.label],
      },
    ].filter((reference) => reference.terms.length > 0);

    const premiseTokenizePrompt = buildPylymarkTokenizePrompt({
      text: response.premise,
      references,
    });
    const hookTokenizePrompt = buildPylymarkTokenizePrompt({
      text: response.hook,
      references,
    });

    const [premiseTokenized, hookTokenized] = await Promise.all([
      requestOpenAiResponseJson(premiseTokenizePrompt),
      requestOpenAiResponseJson(hookTokenizePrompt),
    ]);

    return {
      prompt,
      rawResponse: response,
      tokenizedResponse: {
        premise: premiseTokenized.data.text,
        hook: hookTokenized.data.text,
      },
      references,
    };
  },
);

export const functions = [generatePronunciationRecurringHint] as const;

const setKeyToToneSoundId: Record<string, PinyinSoundId> = {
  entrance: `1` as PinyinSoundId,
  stairway: `2` as PinyinSoundId,
  basement: `3` as PinyinSoundId,
  bathroom: `4` as PinyinSoundId,
  hiddenCloset: `5` as PinyinSoundId,
};
