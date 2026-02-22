import { openaiApiKey } from "@/util/env";
import { nonNullable } from "@pinyinly/lib/invariant";

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    } | null;
  }>;
};

export async function requestOpenAiJson<T>(opts: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const apiKey = nonNullable(openaiApiKey);

  const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
    method: `POST`,
    headers: {
      "Content-Type": `application/json`,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: `gpt-4.1-mini`,
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 600,
      response_format: { type: `json_object` },
      messages: [
        { role: `system`, content: opts.system },
        { role: `user`, content: opts.user },
      ],
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => ``);
    throw new Error(
      `OpenAI request failed (${response.status}): ${bodyText.slice(0, 500)}`,
    );
  }

  const data = (await response.json()) as OpenAiChatResponse;
  const content = data.choices?.[0]?.message?.content ?? ``;

  if (content.length === 0) {
    throw new Error(`OpenAI response was empty`);
  }

  return JSON.parse(content) as T;
}
