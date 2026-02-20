import z from "zod/v4";

export const hanziCharacterColorSchema = z.enum([
  `blue`,
  `yellow`,
  `amber`,
  `cyanold`,
  `fg`,
]);

export type HanziCharacterColor = z.infer<typeof hanziCharacterColorSchema>;
