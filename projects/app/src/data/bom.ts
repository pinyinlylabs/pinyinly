import { deepReadonly, memoize0 } from "@pinyinly/lib/collections";
import { Platform } from "react-native";
import z from "zod/v4";

const bomSchema = z
  .array(
    z.tuple([
      z.string().describe(`License SPDX identifier`),
      z.array(z.string().describe(`Package name`)),
    ]),
  )
  .transform((x) => new Map(x));

export const loadBillOfMaterials = memoize0(async () =>
  bomSchema.transform(deepReadonly).parse(
    Platform.select({
      android:
        // eslint-disable-next-line unicorn/no-await-expression-member
        (await import(`./bom/billOfMaterials.android.asset.json`)).default,
      ios:
        // eslint-disable-next-line unicorn/no-await-expression-member
        (await import(`./bom/billOfMaterials.ios.asset.json`)).default,
      web:
        // eslint-disable-next-line unicorn/no-await-expression-member
        (await import(`./bom/billOfMaterials.web.asset.json`)).default,
    }),
  ),
);

const fontBomSchema = z
  .array(
    z.object({
      name: z.string().describe(`Font name`),
      license: z.string().describe(`License text`),
    }),
  )
  .transform(deepReadonly);

export type FontBomEntry = z.infer<typeof fontBomSchema>[number];

export const loadFontBillOfMaterials = memoize0(async () =>
  fontBomSchema.parse(
    // eslint-disable-next-line unicorn/no-await-expression-member
    (await import(`./bom/fontBillOfMaterials.asset.json`)).default,
  ),
);
