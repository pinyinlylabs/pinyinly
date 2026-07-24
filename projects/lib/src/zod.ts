import { z } from "zod";

export const jsonCodec = <T extends z.core.$ZodType>(schema: T) =>
  z.codec(z.string(), schema, {
    decode: (jsonString, ctx) => {
      try {
        const parsed: unknown = JSON.parse(jsonString);
        return parsed as z.input<T>;
      } catch (err: unknown) {
        ctx.issues.push({
          code: `invalid_format`,
          format: `json`,
          input: jsonString,
          message: err instanceof Error ? err.message : `Invalid JSON`,
        });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });
