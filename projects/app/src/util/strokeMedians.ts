import z from "zod";

const encodedMedianPointsSchema = z.string().trim();
const coordinateSchema = z.coerce.number().pipe(z.number());
const pointSchema = z.tuple([z.number(), z.number()]).readonly();
const medianPointsSchema = z.array(pointSchema).readonly();

export type StrokeMedianPoint = z.infer<typeof pointSchema>;

export const strokeMedianCodec = z.codec(
  encodedMedianPointsSchema,
  medianPointsSchema,
  {
    decode: (encodedMedian) => {
      return encodedMedian.split(`;`).map((pointText) => {
        const [xText, yText] = pointText.split(`,`);
        const x = coordinateSchema.parse(xText);
        const y = coordinateSchema.parse(yText);
        return [x, y] as const;
      });
    },
    encode: (points) => points.map(([x, y]) => `${x},${y}`).join(`;`),
  },
);

export const strokeMediansCodec = z.codec(
  z.array(encodedMedianPointsSchema),
  z.array(medianPointsSchema).readonly(),
  {
    decode: (encodedMedians) =>
      encodedMedians.map((encodedMedian) =>
        strokeMedianCodec.decode(encodedMedian),
      ),
    encode: (medians) =>
      medians.map((median) => strokeMedianCodec.encode(median)),
  },
);
