import { invariant } from "@pinyinly/lib/invariant";
import type { Debugger } from "debug";
import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ResponseFormatJSONSchema,
} from "openai/resources/index.mjs";
import { z } from "zod/v4";
import type { DbCache } from "./cache.js";

export const openAiWithCache = async (
  body: ChatCompletionCreateParamsNonStreaming,
  ctx: {
    dbCache: DbCache;
    openai?: OpenAI;
    debug?: Debugger;
  },
) => {
  const openai = ctx.openai ?? new OpenAI();
  const debug = ctx.debug?.extend(`openAi`);
  const cached = ctx.dbCache.get(body);

  if (debug?.enabled === true) {
    for (const message of body.messages) {
      debug(`Role: %s`, message.role);
      if (typeof message.content === `string`) {
        debug(`Content:\n%s`, message.content);
      } else {
        debug(`Content:\%O`, message.content);
      }
      debug(``);
    }
  }

  if (cached == null) {
    debug?.(`Making OpenAI chat request (not cached): %O`, body);
    const completion = await openai.chat.completions.create(body);
    const result = completion.choices[0]?.message.content;
    debug?.(`OpenAI chat response: %O`, result);
    invariant(
      result != null,
      `No result for OpenAI request:\n${JSON.stringify(body, null, 2)}`,
    );
    ctx.dbCache.set(body, result);
    return result;
  }
  invariant(typeof cached === `string`);
  return cached;
};

export function makeSimpleAiClient(dbCache: DbCache) {
  const openai = new OpenAI();

  return async function simpleOpenAiWithCache<Schema extends z.ZodType>(
    docs: string[],
    userMessage: string,
    schema: Schema,
    model = `o3`,
  ): Promise<z.infer<Schema>> {
    const rawJson = await openAiWithCache(
      {
        model,
        messages: [
          await systemRoleMessageWithProjectContext(docs),
          { role: `user`, content: userMessage },
        ],
        response_format: zodResponseFormat(schema, `result_shape`),
      },
      { dbCache, openai },
    );

    return schema.parse(JSON.parse(rawJson));
  };
}

async function systemRoleMessageWithProjectContext(
  docsFileNames: string[],
): Promise<{
  role: `system`;
  content: string;
}> {
  const docsPath = path.join(import.meta.dirname + `../../../../../docs`);

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

export function zodResponseFormat(
  zodObject: z.ZodType,
  name: string,
): ResponseFormatJSONSchema {
  return {
    type: `json_schema`,
    json_schema: {
      schema: z.toJSONSchema(zodObject, { unrepresentable: `any` }),
      name,
    },
  };
}
