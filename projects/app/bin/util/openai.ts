import { readFile } from "@pinyinly/lib/fs";
import type { FsDbCache } from "@pinyinly/lib/fs";
import { invariant } from "@pinyinly/lib/invariant";
import path from "node:path";
import type OpenAI from "openai";
import type { z } from "zod";
import { requestOpenAiResponseJson } from "#server/lib/ai.js";
import type { ChatPrompt } from "#server/lib/ai.js";

export async function makeSimplePrompt<Schema extends z.ZodType>(
  docs: string[],
  userMessage: string,
  schema: Schema,
): Promise<ChatPrompt<Schema>> {
  return {
    model: `gpt-5` as OpenAI.ChatModel,
    reasoningEffort: `low`,
    messages: [
      await systemRoleMessageWithProjectContext(docs),
      { role: `user`, content: userMessage },
    ],
    schema,
  };
}

export function makeRequestOpenAiResponseJsonCached(fsDbCache: FsDbCache) {
  return async function requestOpenAiResponseJsonCached<
    Schema extends z.ZodType,
  >(prompt: ChatPrompt<Schema>): Promise<z.infer<Schema>> {
    // Check cache first using a stable cache key
    const cacheKey = JSON.stringify({
      model: prompt.model,
      messages: prompt.messages,
    });
    const cached = fsDbCache.get(cacheKey);
    if (cached != null) {
      invariant(typeof cached === `string`);
      return prompt.schema.parse(JSON.parse(cached));
    }

    const result = await requestOpenAiResponseJson(prompt);
    fsDbCache.set(cacheKey, JSON.stringify(result.data));
    return result.data;
  };
}

async function systemRoleMessageWithProjectContext(
  docsFileNames: string[],
): Promise<{
  role: `system`;
  content: string;
}> {
  const docsPath = path.join(
    import.meta.dirname + `../../../../../.github/instructions`,
  );

  const messageLines = [
    `You are helping someone build a Chinese language learning app.`,
  ];

  if (docsFileNames.length > 0) {
    messageLines.push(
      ``,
      `Use the following documentation about the project:`,
      ``,
    );

    for (const fileName of docsFileNames) {
      messageLines.push(
        ``,
        `<!---`,
        fileName,
        `-->`,
        ``,
        await readFile(path.join(docsPath, fileName), { encoding: `utf-8` }),
      );
    }
  }

  return {
    role: `system`,
    content: messageLines.join(`\n`),
  };
}
