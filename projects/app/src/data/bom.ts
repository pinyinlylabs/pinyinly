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
      android: (await import(`./bom/billOfMaterials.android.asset.json`))
        .default,
      ios: (await import(`./bom/billOfMaterials.ios.asset.json`)).default,
      web: (await import(`./bom/billOfMaterials.web.asset.json`)).default,
    }),
  ),
);
