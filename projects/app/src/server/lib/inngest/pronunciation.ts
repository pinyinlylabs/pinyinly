import {
  glossOrThrow,
  hanziFromHanziWord,
  loadDictionary,
  oneUnitPinyinOrNull,
} from "@/dictionary";
import { withDrizzle } from "@/server/lib/db";
import {
  inngest,
  populatePronunciationMnemonicImageEvent,
  populatePronunciationMnemonicSpecBeatsEvent,
  populatePronunciationMnemonicSpecEvent,
  populatePronunciationMnemonicSpecHookAndPremiseEvent,
  pronunciationGenerateMnemonicStoryboardImageEvent,
  pronunciationGenerateMnemonicStoryboardPanelsEvent,
  pronunciationGenerateRecurringMnemonicEvent,
} from "./client";
import { normalizePinyinUnit, splitPinyinUnitOrThrow } from "@/data/pinyin";
import {
  getActorModelSheetImage,
  getActorSpec,
  getLocationSetIdentityImage,
  getLocationSpec,
  getMnemonicAssociationsForPinyin,
  getPronunciationMnemonicSpec,
  getUserSetting,
  setUserSetting,
} from "@/server/lib/query";
import { buildPronunciationMnemonicRecurringPrompt } from "@/util/prompts/pronunciationMnemonicRecurring";
import { invariant } from "@pinyinly/lib/invariant";
import { buildPylymarkTokenizePrompt } from "@/util/prompts/pylymarkTokenize";
import { buildPronunciationMnemonicStoryboardPanelsPrompt } from "@/util/prompts/pronunciationMnemonicStoryboardPanels";
import { parsePylymark, stripTokens, stringifyPylymark } from "@/data/pylymark";
import { buildPronunciationMnemonicStoryboardImagePrompt } from "@/util/prompts/pronunciationMnemonicStoryboardImage";
import { geminiRequestImageAsAsset } from "./gemini";
import { step } from "inngest";
import { requestOpenAiResponseJson } from "@/server/lib/ai";
import type { HanziText, HanziWord, PinyinUnit } from "@/data/model";
import {
  getLocationSetKeyDisplayName,
  pronunciationMnemonicImageSetting,
  pronunciationMnemonicSpecSetting,
  pronunciationMnemonicTextSetting,
} from "@/data/userSettings";

function normalizeTerms(terms: readonly string[]): string[] {
  return [
    ...new Set(
      terms.map((term) => term.trim()).filter((term) => term.length > 0),
    ),
  ];
}

export const generatePronunciationRecurringMnemonic = inngest.createFunction(
  {
    id: `pronunciation/generateRecurringMnemonic`,
    triggers: [pronunciationGenerateRecurringMnemonicEvent],
  },
  async ({ event }) => {
    const {
      userId,
      actorId,
      hanziWord,
      locationId,
      locationSetKey,
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

    const prompt = buildPronunciationMnemonicRecurringPrompt({
      actorSpec,
      cue,
      locationSpec,
      locationSetKey,
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
        terms: [getLocationSetKeyDisplayName(locationSetKey)],
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

export const generatePronunciationMnemonicStoryboardPanels =
  inngest.createFunction(
    {
      id: `pronunciation/generateMnemonicStoryboardPanels`,
      triggers: [pronunciationGenerateMnemonicStoryboardPanelsEvent],
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
        return getPronunciationMnemonicSpec(db, userId, hanzi, pinyin);
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

      const prompt = buildPronunciationMnemonicStoryboardPanelsPrompt({
        locationSpec: locationSpec,
        locationSetKey: setKey,
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

async function getHanziAndPinyinForHanziWord(
  hanziWord: HanziWord,
): Promise<{ hanzi: HanziText; pinyin: PinyinUnit }> {
  const dictionary = await loadDictionary();
  const meaning = dictionary.lookupHanziWord(hanziWord);
  invariant(
    meaning != null,
    `Dictionary meaning not found for hanziWord: ${hanziWord}`,
  );
  const hanzi = hanziFromHanziWord(hanziWord);
  const pinyin = meaning.pinyin?.[0];
  invariant(pinyin != null, `Pinyin not found for hanziWord: ${hanziWord}`);

  return {
    hanzi,
    pinyin: normalizePinyinUnit(pinyin),
  };
}

export const populatePronunciationMnemonicSpec = inngest.createFunction(
  {
    id: `pronunciation/populateHintMnemonicSpec`,
    triggers: [populatePronunciationMnemonicSpecEvent],
  },
  async ({ event }) => {
    const { userId, hanziWord } = event.data;

    await step.invoke(`populate hook and premise`, {
      function: populatePronunciationMnemonicSpecHookAndPremise,
      data: { userId, hanziWord },
    });

    // save the hook+premise to the hint field.
    await step.run(`save hook and premise to hint`, async () =>
      withDrizzle(async (db) => {
        const { hanzi, pinyin } =
          await getHanziAndPinyinForHanziWord(hanziWord);

        const current = await getUserSetting(
          db,
          userId,
          pronunciationMnemonicTextSetting,
          { hanzi, pinyin },
        );
        if (current && current.text.trim().length > 0) {
          // Don't overwrite existing text if it's already set.
          return;
        }

        const spec = await getPronunciationMnemonicSpec(
          db,
          userId,
          hanzi,
          pinyin,
        );
        invariant(
          spec?.hook != null && spec.premise != null,
          `Expected hook and premise to be populated for hanzi: %s, pinyin: %s`,
          hanzi,
          pinyin,
        );

        await setUserSetting(db, userId, {
          key: pronunciationMnemonicTextSetting.entity.marshalKey({
            hanzi,
            pinyin,
          }),
          value: pronunciationMnemonicTextSetting.entity.marshalValue({
            hanzi,
            pinyin,
            text: `${spec.hook}\n\n${spec.premise}`,
          }),
        });
      }),
    );

    await step.invoke(`populate beats`, {
      function: populatePronunciationMnemonicSpecBeats,
      data: { userId, hanziWord },
    });

    await step.invoke(`populate image`, {
      function: populatePronunciationMnemonicImage,
      data: { userId, hanziWord },
    });
  },
);

export const populatePronunciationMnemonicImage = inngest.createFunction(
  {
    id: `pronunciation/populateMnemonicImage`,
    triggers: [populatePronunciationMnemonicImageEvent],
  },
  async ({ event }) => {
    const { userId, hanziWord } = event.data;
    const { hanzi, pinyin } = await getHanziAndPinyinForHanziWord(hanziWord);

    const isAlreadySet = await step.run(`read current image`, async () =>
      withDrizzle(async (db) => {
        const decoded = await getUserSetting(
          db,
          userId,
          pronunciationMnemonicImageSetting,
          { hanzi, pinyin },
        );
        return decoded?.imageId != null;
      }),
    );

    if (isAlreadySet) {
      return;
    }

    const { actorId, locationId, locationSetKey, hook, premise, beats } =
      await withDrizzle(async (db) => {
        const { actorId, locationId, locationSetKey } =
          await getMnemonicAssociationsForPinyin(db, userId, pinyin);
        const specResult = await getPronunciationMnemonicSpec(
          db,
          userId,
          hanzi,
          pinyin,
        );

        invariant(
          specResult?.hook != null,
          `Expected hook to be populated for hanzi: ${hanzi}, pinyin: ${pinyin}`,
        );
        invariant(
          specResult.premise != null,
          `Expected premise to be populated for hanzi: ${hanzi}, pinyin: ${pinyin}`,
        );
        invariant(
          specResult.beats != null,
          `Expected beats to be populated for hanzi: ${hanzi}, pinyin: ${pinyin}`,
        );

        const { hook, premise, beats } = specResult;

        return { actorId, locationId, locationSetKey, hook, premise, beats };
      });

    const generateResult = await step.invoke(`generate identity image`, {
      function: generatePronunciationMnemonicStoryboardImage,
      data: {
        actorId,
        beats,
        hook,
        locationId,
        premise,
        setKey: locationSetKey,
        userId,
      },
    });

    await step.run(`write image`, async () =>
      withDrizzle(async (db) => {
        await setUserSetting(db, userId, {
          key: pronunciationMnemonicImageSetting.entity.marshalKey({
            hanzi,
            pinyin,
          }),
          value: pronunciationMnemonicImageSetting.entity.marshalValue({
            hanzi,
            pinyin,
            imageId: generateResult.response,
          }),
        });
      }),
    );
  },
);

export const populatePronunciationMnemonicSpecHookAndPremise =
  inngest.createFunction(
    {
      id: `pronunciation/populateHintMnemonicSpecHookAndPremise`,
      triggers: [populatePronunciationMnemonicSpecHookAndPremiseEvent],
    },
    async ({ event }) => {
      const { userId, hanziWord } = event.data;

      const { hanzi, pinyin } = await getHanziAndPinyinForHanziWord(hanziWord);
      {
        const existingSpec = await withDrizzle(async (db) => {
          return getPronunciationMnemonicSpec(db, userId, hanzi, pinyin);
        });

        if (existingSpec?.hook != null && existingSpec.premise != null) {
          return;
        }
      }

      const { actorId, locationId, locationSetKey } = await withDrizzle(
        async (db) => {
          return getMnemonicAssociationsForPinyin(db, userId, pinyin);
        },
      );

      const generateResult = await step.invoke(`generate hook and premise`, {
        function: generatePronunciationRecurringMnemonic,
        data: {
          actorId,
          hanziWord,
          locationId,
          locationSetKey,
          associationStrategy: `identityBinding`,
          userId,
        },
      });

      {
        await withDrizzle(async (db) => {
          const existingSpec = await getPronunciationMnemonicSpec(
            db,
            userId,
            hanzi,
            pinyin,
          );
          if (existingSpec?.hook != null && existingSpec.premise != null) {
            return;
          }

          const updatedSpec = {
            ...existingSpec,
            hook: generateResult.tokenizedResponse.hook,
            premise: generateResult.tokenizedResponse.premise,
          };

          await setUserSetting(db, userId, {
            key: pronunciationMnemonicSpecSetting.entity.marshalKey({
              hanzi,
              pinyin,
            }),
            value: pronunciationMnemonicSpecSetting.entity.marshalValue({
              hanzi,
              pinyin,
              value: updatedSpec,
            }),
          });
        });
      }
    },
  );

export const populatePronunciationMnemonicSpecBeats = inngest.createFunction(
  {
    id: `pronunciation/populateHintMnemonicSpecBeats`,
    triggers: [populatePronunciationMnemonicSpecBeatsEvent],
  },
  async ({ event }) => {
    const { userId, hanziWord } = event.data;

    const { hanzi, pinyin } = await getHanziAndPinyinForHanziWord(hanziWord);
    {
      const existingSpec = await withDrizzle(async (db) => {
        return getPronunciationMnemonicSpec(db, userId, hanzi, pinyin);
      });

      if (existingSpec?.beats != null) {
        return;
      }
    }

    const { actorId, locationId, locationSetKey } = await withDrizzle(
      async (db) => {
        return getMnemonicAssociationsForPinyin(db, userId, pinyin);
      },
    );

    const generateResult = await step.invoke(`generate beats`, {
      function: generatePronunciationMnemonicStoryboardPanels,
      data: {
        userId,
        actorId,
        locationId,
        setKey: locationSetKey,
        hanzi,
        pinyin,
      },
    });

    {
      await withDrizzle(async (db) => {
        const existingSpec = await getPronunciationMnemonicSpec(
          db,
          userId,
          hanzi,
          pinyin,
        );
        if (existingSpec?.beats != null) {
          return;
        }

        const updatedSpec = {
          ...existingSpec,
          beats: generateResult.response.data.panels,
        };

        await setUserSetting(db, userId, {
          key: pronunciationMnemonicSpecSetting.entity.marshalKey({
            hanzi,
            pinyin,
          }),
          value: pronunciationMnemonicSpecSetting.entity.marshalValue({
            hanzi,
            pinyin,
            value: updatedSpec,
          }),
        });
      });
    }
  },
);

export const generatePronunciationMnemonicStoryboardImage =
  inngest.createFunction(
    {
      id: `pronunciation/generateMnemonicStoryboardImage`,
      triggers: [pronunciationGenerateMnemonicStoryboardImageEvent],
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

      const prompt = buildPronunciationMnemonicStoryboardImagePrompt({
        actorSpec: actorSpec,
        locationSpec: locationSpec,
        locationSetKey: setKey,
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
  generatePronunciationRecurringMnemonic,
  generatePronunciationMnemonicStoryboardPanels,
  generatePronunciationMnemonicStoryboardImage,
  populatePronunciationMnemonicSpec,
  populatePronunciationMnemonicImage,
  populatePronunciationMnemonicSpecHookAndPremise,
  populatePronunciationMnemonicSpecBeats,
] as const;
