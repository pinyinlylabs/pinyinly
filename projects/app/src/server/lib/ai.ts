import { preflightCheckEnvVars } from "@/util/env";
import { invariant } from "@pinyinly/lib/invariant";

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    } | null;
  }>;
};

const DEFAULT_OPENAI_MODEL = `gpt-4.1-mini`;

function getOpenAiConfig(): {
  apiKey: string;
  baseUrl: string;
  model: string;
} {
  const apiKey = String(process.env[`PYLY_OPENAI_API_KEY`] ?? ``);
  const baseUrl = String(
    process.env[`PYLY_OPENAI_BASE_URL`] ?? `https://api.openai.com/v1`,
  );
  const model = String(
    process.env[`PYLY_OPENAI_MODEL`] ?? DEFAULT_OPENAI_MODEL,
  );

  if (preflightCheckEnvVars) {
    invariant(apiKey.length > 0, `PYLY_OPENAI_API_KEY is required`);
  }

  return { apiKey, baseUrl, model };
}

export async function requestOpenAiJson<T>(opts: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const { apiKey, baseUrl, model } = getOpenAiConfig();

  if (apiKey.length === 0) {
    throw new Error(`Missing PYLY_OPENAI_API_KEY`);
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: `POST`,
    headers: {
      "Content-Type": `application/json`,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
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
