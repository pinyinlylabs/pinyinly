import type {
  GeminiImageModel,
  GeminiImageResolutionPreset,
  GeminiImageThinkingLevel,
  ImagePrompt,
} from "@/server/lib/gemini";
import type { AiReferenceImage } from "@/data/model";
import type { GeminiImageAspectRatio } from "@/util/geminiImageAspectRatio";

export type ImagePromptTemplateInput = {
  userTemplate: string;
  variables: Record<string, string>;
  model?: GeminiImageModel;
  systemTemplate?: string;
  referenceImages?: AiReferenceImage[];
  aspectRatio?: GeminiImageAspectRatio;
  resolution?: GeminiImageResolutionPreset;
  thinkingLevel?: GeminiImageThinkingLevel;
};

export function renderPromptTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template
    .trim()
    .replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/gu, (_, key: string) => {
      return variables[key] ?? ``;
    });
}

export function buildImagePromptTemplate({
  userTemplate,
  variables,
  model,
  systemTemplate,
  referenceImages,
  aspectRatio,
  resolution,
  thinkingLevel,
}: ImagePromptTemplateInput): ImagePrompt {
  const userPrompt = renderPromptTemplate(userTemplate, variables);
  const systemInstruction =
    systemTemplate == null || systemTemplate.trim().length === 0
      ? undefined
      : renderPromptTemplate(systemTemplate, variables);

  return {
    model: model ?? `gemini-2.5-flash-image`,
    ...(systemInstruction == null ? {} : { systemInstruction }),
    messages: [{ role: `user`, content: userPrompt }],
    ...(referenceImages == null ? {} : { referenceImages }),
    ...(aspectRatio == null ? {} : { aspectRatio }),
    ...(resolution == null ? {} : { resolution }),
    ...(thinkingLevel == null ? {} : { thinkingLevel }),
  };
}
