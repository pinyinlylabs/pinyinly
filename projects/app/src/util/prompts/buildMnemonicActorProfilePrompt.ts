import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { z } from "zod";

export type MnemonicActorPromptInputType = {
  identity: string;
};

export const mnemonicActorProfileSchema = z
  .object({
    identity: z.string().min(1),
    nickname: z.string().min(1),
    summary: z.string().min(1),
    identityAnchor: z.string().min(1),
    coreTraits: z.array(z.string().min(1)),
    obsession: z.string().min(1),
    signatureAbility: z.string().min(1),
    storyRole: z.string().min(1),
    always: z.array(z.string().min(1)),
    never: z.array(z.string().min(1)),
    likes: z.array(z.string().min(1)),
    dislikes: z.array(z.string().min(1)),
    defaultMood: z.string().min(1),
    bodyLanguage: z.string().min(1),
    signatureExpression: z.string().min(1),
    weakness: z.string().min(1),
  })
  .strict();

export type MnemonicActorProfileType = z.infer<
  typeof mnemonicActorProfileSchema
>;

export function buildMnemonicActorProfilePrompt({
  identity,
}: MnemonicActorPromptInputType): ChatPrompt<
  typeof buildMnemonicActorProfilePrompt.schema
> {
  const systemTemplate = `
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
`;

  const data = {
    identity,
  };

  const userTemplate = `
Generate a mnemonic actor for:

<input>
{{ input }}
</input>

`;

  const messages: ChatPromptMessage[] = [
    { role: `system`, content: renderPromptTemplate(systemTemplate, {}) },
    {
      role: `user`,
      content: renderPromptTemplate(userTemplate, {
        input: JSON.stringify(data, null, 2),
      }),
    },
  ];

  return {
    messages,
    schema: buildMnemonicActorProfilePrompt.schema,
    model: `gpt-5.5`,
    reasoningEffort: `medium`,
  };
}
buildMnemonicActorProfilePrompt.schema = mnemonicActorProfileSchema;
