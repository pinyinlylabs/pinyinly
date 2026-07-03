import z from "zod";

export const hanziCharacterColorSchema = z.enum([
  `blue`,
  `yellow`,
  `amber`,
  `cyanold`,
  `fg`,
]);

export type HanziCharacterColor = z.infer<typeof hanziCharacterColorSchema>;
