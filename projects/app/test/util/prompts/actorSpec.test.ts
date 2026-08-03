import { buildActorSpecPrompt } from "#util/prompts/actorSpec.ts";
import { describe, expect, test } from "vitest";
import { fmtChatPromptForSnapshot } from "./helpers";

describe(
  `buildActorSpecPrompt` satisfies HasNameOf<typeof buildActorSpecPrompt>,
  () => {
    test(`snapshot`, () => {
      const prompt = buildActorSpecPrompt({
        identity: `Dracula`,
      });

      expect(fmtChatPromptForSnapshot(prompt)).toMatchInlineSnapshot(`
        {
          "messages": "
        =====================
         SYSTEM MESSAGE
        ---------------------
        You are designing a recurring mnemonic actor for a Chinese language learning system.

        The input is a single actor identity, for example:

        - Bear
        - Fox
        - Chef
        - Skeleton
        - Leprechaun
        - Julius Caesar

        Your job is NOT to invent a completely new character.

        Instead, identify the strongest, most universally recognised mental model people already have for this identity, then compress and sharpen it into a simple recurring character that could appear consistently across hundreds of mnemonic stories.

        The goal is that, after seeing this actor repeatedly, a learner immediately thinks:

        "Yep, that's exactly what they'd do."

        The actor should feel like a cartoon character with one clear personality rather than a realistic person.

        ## Design Principles

        - Preserve existing cultural expectations whenever possible.
        - Don't fight the stereotype-embrace it.
        - Give the actor one dominant motivation or obsession.
        - Give them one obvious strength.
        - Give them one memorable weakness.
        - Behaviours should naturally emerge from the identity.
        - Avoid unnecessary backstory or lore.
        - Keep the personality simple and highly consistent.
        - Optimise for recognition, not realism.
        - The actor should be suitable for children and adults.
        - Humour is encouraged.
        - The actor should be expressive enough that an illustrator could draw them consistently.

        ## Nickname

        Create a short nickname.

        The nickname should feel like something friends would call the character.

        Prefer names that reinforce the identity.

        Good examples:

        - Bravo the Bear
        - Lucky the Leprechaun
        - Skully the Skeleton

        Avoid generic human first names unless they genuinely strengthen the mnemonic.

        ## Field Guidance

        identity
        The original actor identity supplied as input.

        nickname
        A memorable recurring nickname.

        summary
        One sentence describing who this character is.

        identityAnchor
        The shortest possible description that captures the essence of the character.
        Examples:
        - Honey-loving bear.
        - Wish-granting genie.
        - Gold-hoarding leprechaun.
        - Ancient Roman emperor.

        coreTraits
        Three to five stable personality traits.

        obsession
        The one thing they care about more than anything else.

        signatureAbility
        The one thing they naturally do that makes stories memorable.

        storyRole
        How they usually move stories forward.
        Examples:
        - Solves problems using strength.
        - Creates mischief.
        - Guides others.
        - Protects people.
        - Causes unexpected chaos.

        always
        Things the character almost always does.

        never
        Things that would feel out of character.

        likes
        Things they naturally enjoy.

        dislikes
        Things they naturally avoid.

        defaultMood
        Their baseline emotional state.

        bodyLanguage
        How they physically carry themselves.

        signatureExpression
        Their characteristic facial expression.

        weakness
        A recurring flaw that creates interesting story situations.

        ## Success Criteria

        A successful actor should:

        - be immediately recognisable
        - have a very distinctive personality
        - behave consistently across stories
        - almost write stories by themselves
        - never require the learner to remember lots of lore
        - reinforce the same mental image every time they appear
        =====================



        =====================
         USER MESSAGE
        ---------------------
        Generate a mnemonic actor for:

        <input>
        {"identity":"Dracula"}
        </input>
        =====================
        ",
          "model": "gpt-5.4",
          "reasoningEffort": "medium",
          "schema": {
            "name": "actorSpecSchema",
            "schema": {
              "additionalProperties": false,
              "properties": {
                "always": {
                  "items": {
                    "type": "string",
                  },
                  "type": "array",
                },
                "bodyLanguage": {
                  "type": "string",
                },
                "coreTraits": {
                  "items": {
                    "type": "string",
                  },
                  "type": "array",
                },
                "defaultMood": {
                  "type": "string",
                },
                "dislikes": {
                  "items": {
                    "type": "string",
                  },
                  "type": "array",
                },
                "identity": {
                  "type": "string",
                },
                "identityAnchor": {
                  "type": "string",
                },
                "likes": {
                  "items": {
                    "type": "string",
                  },
                  "type": "array",
                },
                "never": {
                  "items": {
                    "type": "string",
                  },
                  "type": "array",
                },
                "nickname": {
                  "type": "string",
                },
                "obsession": {
                  "type": "string",
                },
                "signatureAbility": {
                  "type": "string",
                },
                "signatureExpression": {
                  "type": "string",
                },
                "storyRole": {
                  "type": "string",
                },
                "summary": {
                  "type": "string",
                },
                "weakness": {
                  "type": "string",
                },
              },
              "required": [
                "nickname",
                "identity",
                "summary",
                "identityAnchor",
                "coreTraits",
                "obsession",
                "signatureAbility",
                "storyRole",
                "always",
                "never",
                "likes",
                "dislikes",
                "defaultMood",
                "bodyLanguage",
                "signatureExpression",
                "weakness",
              ],
              "title": "actorSpecSchema",
              "type": "object",
            },
            "type": "json_schema",
          },
        }
      `);
    });
  },
);
