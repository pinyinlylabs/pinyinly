import {
  glossOrThrow,
  hanziFromHanziWord,
  loadDictionary,
  oneUnitPinyinOrNull,
} from "@/dictionary";
import { withDrizzle } from "@/server/lib/db";
import {
  inngest,
  pronunciationGenerateHintStoryboardImageEvent,
  pronunciationGenerateHintStoryboardPanelsEvent,
  pronunciationGenerateHintEvent as pronunciationGenerateRecurringHintEvent,
} from "./client";
import type { PinyinSoundId } from "@/data/model";
import { splitPinyinUnitOrThrow } from "@/data/pinyin";
import {
  getActorModelSheetImage,
  getActorSpec,
  getLocationSetIdentityImage,
  getLocationSpec,
  getPronunciationHintMnemonicSpec,
} from "@/server/lib/query";
import { buildPronunciationHintRecurringPrompt } from "@/util/prompts/pronunciationHintRecurring";
import { invariant } from "@pinyinly/lib/invariant";
import { requestOpenAiResponseJson } from "@/server/lib/ai";
import { buildPylymarkTokenizePrompt } from "@/util/prompts/pylymarkTokenize";
import { buildPronunciationHintStoryboardPanelsPrompt } from "@/util/prompts/pronunciationHintStoryboardPanels";
import { parsePylymark, stripTokens, stringifyPylymark } from "@/data/pylymark";
import { buildPronunciationHintStoryboardImagePrompt } from "@/util/prompts/pronunciationHintStoryboardImage";
import { geminiRequestImageAsAsset } from "./gemini";
import { step } from "inngest";

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
    triggers: [pronunciationGenerateRecurringHintEvent],
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

export const generatePronunciationHintStoryboardPanels = inngest.createFunction(
  {
    id: `pronunciation/generateHintStoryboardPanels`,
    triggers: [pronunciationGenerateHintStoryboardPanelsEvent],
  },
  async ({ event }) => {
    const { actorId, locationId, userId, setKey, hanzi, pinyin } = event.data;

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

    const pronunciationMnemonicSpec = await withDrizzle(async (db) => {
      return getPronunciationHintMnemonicSpec(db, userId, hanzi, pinyin);
    });

    invariant(
      pronunciationMnemonicSpec != null,
      `Pronunciation hint mnemonic spec not found for hanzi: ${hanzi}, pinyin: ${pinyin}`,
    );

    const { hook, premise } = pronunciationMnemonicSpec;
    invariant(
      hook != null,
      `Hook not found in pronunciation hint mnemonic spec`,
    );

    invariant(
      premise != null,
      `Premise not found in pronunciation hint mnemonic spec`,
    );

    // Remove [-ong foo] style tokens from the hook and premise for the
    // storyboard prompt as these might confuse the storyboard prompt.
    const hookPlaintext = stringifyPylymark(stripTokens(parsePylymark(hook)));
    const premisePlaintext = stringifyPylymark(
      stripTokens(parsePylymark(premise)),
    );

    const prompt = buildPronunciationHintStoryboardPanelsPrompt({
      locationSet: locationSetSpec,
      actor: actorSpec,
      hook: hookPlaintext,
      premise: premisePlaintext,
    });

    const response = await requestOpenAiResponseJson(prompt);

    return {
      response,
      prompt,
    };
  },
);

export const generatePronunciationHintStoryboardImage = inngest.createFunction(
  {
    id: `pronunciation/generateHintStoryboardImage`,
    triggers: [pronunciationGenerateHintStoryboardImageEvent],
  },
  async ({ event }) => {
    const { actorId, locationId, userId, setKey, hook, beats, premise } =
      event.data;

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

    // Remove [-ong foo] style tokens from the hook and premise for the
    // storyboard prompt as these might confuse the storyboard prompt.
    const hookPlaintext = stringifyPylymark(stripTokens(parsePylymark(hook)));
    const premisePlaintext = stringifyPylymark(
      stripTokens(parsePylymark(premise)),
    );

    const actorModelSheetAssetId = await withDrizzle(async (db) => {
      return getActorModelSheetImage(db, userId, actorId);
    });

    invariant(
      actorModelSheetAssetId != null,
      `Actor model sheet not found for actorId: ${actorId}`,
    );

    const locationSetImageAssetId = await withDrizzle(async (db) => {
      return getLocationSetIdentityImage(db, userId, locationId, setKey);
    });

    invariant(
      locationSetImageAssetId != null,
      `Location set identity image not found for locationId: ${locationId}, setKey: ${setKey}`,
    );

    const prompt = buildPronunciationHintStoryboardImagePrompt({
      actor: actorSpec,
      location: locationSpec,
      locationSet: locationSetSpec,
      mnemonicSpec: {
        hook: hookPlaintext,
        premise: premisePlaintext,
        beats,
      },
      actorModelSheet: actorModelSheetAssetId,
      locationSetImage: locationSetImageAssetId,
    });

    const response = await step.invoke(`generate image`, {
      function: geminiRequestImageAsAsset,
      data: { prompt },
    });

    return {
      response,
      prompt,
    };
  },
);

export const functions = [
  generatePronunciationRecurringHint,
  generatePronunciationHintStoryboardPanels,
  generatePronunciationHintStoryboardImage,
] as const;

const setKeyToToneSoundId: Record<string, PinyinSoundId> = {
  entrance: `1` as PinyinSoundId,
  stairway: `2` as PinyinSoundId,
  basement: `3` as PinyinSoundId,
  bathroom: `4` as PinyinSoundId,
  hiddenCloset: `5` as PinyinSoundId,
};
