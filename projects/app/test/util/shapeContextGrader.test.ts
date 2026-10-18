import { readFile } from "@pinyinly/lib/fs";
import { z } from "zod";
import { hanziCharacterWritingSimilarityThreshold } from "#data/questions/hanziCharacterWriting.ts";
import {
  gradeCharacterShape,
  shapeContextGraderDefaults,
} from "#util/shapeContextGrader.ts";
import type { ShapeContextGraderExample } from "#util/shapeContextGraderExample.ts";
import {
  decodeShapeContextStrokes,
  encodeShapeContextStrokes,
  parseShapeContextGraderExampleFragment,
  parseShapeContextGraderExampleJson,
  shapeContextGraderExampleCharacter,
  serializeShapeContextGraderExample,
  shapeContextGraderExampleFragment,
} from "#util/shapeContextGraderExample.ts";
import type { WritingStrokePoint } from "#util/writingStrokeGrader.ts";
import { transformArphicSpaceSvgPath } from "#util/svgFont.ts";
import SVGPathCommander from "svg-path-commander";
import { describe, expect, test } from "vitest";

const positiveShapeContextGraderExamples: readonly ShapeContextGraderExample[] =
  [
    {
      id: `十-synthetic-positive`,
      drawnStrokes: `109,458;177,478;373,444;819,395;869,401;932,424|456,89;484,97;522,133;512,307;507,933`,
    },
    {
      id: `好-20261017000000`,
      drawnStrokes: `313.7,195.4;313.7,195.6;313.7,196.4;313.7,198.9;313.4,202.2;312.2,205.6;311,210.1;310.1,214.2;308,220.3;305.1,228.2;302.1,236.5;298.8,246.2;294.8,257.1;290.7,268.3;285.8,279.8;280.7,293.2;275.7,306.4;269.3,319.7;264.2,333.6;259.3,346.5;253.9,358.4;245.5,379.1;242.6,385.8;233.9,408.3;231.7,414.5;229.3,420.7;227,426.1;224.9,431.3;222.8,436.4;220.7,440.9;218.7,445.4;215.8,452;213.1,457.4;211.5,460.7;209.1,465.8;206.9,470.8;204.1,476.4;201.2,482.6;198.8,488.7;196.4,494.4;194.1,500.1;191.9,505.5;189.8,510.2;187.5,515.8;186,520.2;184.5,524.8;182.2,531.2;180.3,536.9;178.8,541.5;177,546.8;175.3,551.6;174,556.5;172.6,561.3;171.4,565.4;170.7,568.7;170,571.5;169.2,574.9;168.5,577.8;167.9,580.1;167.1,583;166.5,585.3;166.1,587;165.9,588.6;165.3,590.6;164.9,592.3;164.6,593.5;164.3,594.7;164.3,595.5;164.1,596;163.8,596.5;163.8,596.9;163.8,597.3;163.6,597.8;163.4,598.2;163.3,598.7;163.1,599.3;162.9,599.8;162.6,600.9;162.2,602.8;161.9,604.8;161.2,607.2;160.5,609.6;159.8,612;159.1,614.8;158.1,617.2;157.2,619.1;156.9,620.6;156.5,622.1;156,623.4;155.8,624.4;155.5,625.2;155.2,626.1;154.9,627.2;154.6,628.1;154.6,628.7;154.6,629.2;154.6,629.6;154.6,630.1;154.4,630.4;154.4,630.6;155.9,631.8;158.9,634.4;162.5,638;167.2,643.2;173.1,650.1;179.6,657.7;186.3,666.6;191.8,674.5;197.1,682;203.7,691.7;210.6,702;217.9,712.4;225.2,722.8;232.3,732.4;238.7,741.2;244.4,749.6;249.7,757.1;253.8,762.8;257.6,767.6;262.3,772.8;266.1,777.3;269.5,781.7;272.5,785.6;274.8,788.5;277.1,791.6;279.5,794.4;281.3,796.6;282.8,798.7;284.1,800.3;285.4,802;286.6,803.3;287.5,804.1;288,805.2;288.5,806;289,806.5;289.5,807.3;290.1,808.1;290.5,808.8;291,809.7;291.6,810.9;292.1,812;292.7,813.2;293.3,814.4;293.9,815.6;294.5,816.7;295.1,817.9;295.6,819;295.9,819.9;296.1,820.5;296.3,821.1;296.5,821.6;296.8,822.1;296.8,822.7;296.8,823.2|329.9,479.3;329.9,479.5;329.9,480.2;329.9,481.7;329.9,483.6;329.9,485.2;329.9,487.2;329.9,491.2;329.9,495.7;329.9,499.2;329.9,503.3;329.5,508.9;328.3,516;326,524;322.7,532.3;318.6,541.5;313.1,553.7;306.3,566.4;299.7,577.4;292.8,589.2;287.1,599.5;281.4,609.6;275.6,620.6;269.9,630.6;264.2,641.5;259.9,651.3;255,660.5;250,669.4;244.8,678.8;238.2,689.7;232.4,700.1;226.4,710.8;219.2,721.6;212.1,731.7;205.1,741.6;197.6,751.4;191.6,758.7;186.1,766;179.2,775.1;172.3,784.4;165.4,792.8;158.6,800.4;153.2,806.1;148.9,810.6;144.2,815.4;140.1,819;136.8,821.9;134.1,824.2;132.1,825.9;130.8,827.1;130,827.9;129.2,828.5;128.7,829;128.4,829.4;128.3,829.9;127.8,830.3;127.5,830.8;127.3,831.3;126.8,831.8;126.3,832.1;126,832.3;125.7,832.6;125.5,832.8|59.7,440.8;60.1,440.8;61.3,440.8;63.9,440.8;67.1,440.8;70.6,440.8;75.2,440.8;80.3,440.8;86.4,440.8;93.9,440.8;101.9,440.8;109.1,440.8;116.4,440.8;125.3,440.8;133.4,440.8;139,440.8;146.2,440.8;154.9,440.8;161.9,440.8;167.8,440.8;176,440.8;187.3,440.8;198,440.8;204.8,440.8;209.3,440.8;217.3,440.8;226,440.8;231.2,441.2;235.8,441.6;240.6,442;244.8,442.8;248.4,443.5;251,443.9;253,444.3;254.9,444.6;256.8,444.6;258.7,444.6;260.2,444.6;262.1,444.6;264.8,444.6;267.7,444.6;270.6,444.6;273.5,444.6;276.5,444.9;279.1,445.2;281.6,445.3;284.6,445.6;287.4,446;290.8,446;294.2,446.3;297,446.7;299.3,446.7;302.1,447;305.5,447.4;308.3,447.4;310.8,447.4;313.5,447.7;316.1,448;318.6,448.1;321.1,448.4;323.1,448.7;325,449;326.9,449.3;328.4,449.5;329.9,449.8;331.4,449.9;332.7,450.1;334,450.4;334.9,450.4;335.5,450.7;336.1,450.9;336.6,450.9;336.9,451.2|475.4,234.8;476.3,234.8;478.4,234.8;482.3,234.8;488.2,234.8;494.8,234.8;502.9,234.8;513.5,234.8;522.7,234.8;532.7,234.8;545.7,234.8;560.7,234.8;577.3,234.8;593.9,234.8;610.3,234.8;625.6,234.8;635.8,234.8;648.9,234.8;661,234.8;667.8,234.8;675.3,234.8;681.1,234.8;686.9,234.8;692,234.8;696,235;699.4,235.4;703.4,235.8;707.5,236.6;711.2,237.4;714.2,238.1;716.7,238.8;718.7,239.1;720.2,239.1;721.3,239.1;722,239.3;722.4,239.5;722.9,239.6;723.3,239.6;723.7,239.8;723.8,240.2;723.8,241.1;723.5,241.8;721.9,243.4;718.9,246;714.6,249.9;707.9,255.6;700.1,262.2;692.5,268.8;683.8,276.9;676.2,284.2;668.9,290.5;659.5,299.3;650.5,308.1;641.5,317;632.3,326.1;623.8,335.1;615.4,343.5;607.9,351.1;602.6,356.9;597.9,361.1;592.7,365.9;588.6,370.4;585.3,374.1;582.9,376.3;580.2,378.5;578,380.6;577.1,381.7;576.4,382.5;575.9,382.9;575.6,383.5;575.1,384;574.6,384.5;574.1,385;573.6,385.5;573,385.9;572.1,386.3;571.3,386.8;570.4,387.6;569.3,388.4;568.4,389;567.5,389.8;566.7,390.6;566.1,391.2;565.6,391.7;565.3,392.2;565,392.7;564.5,393.2;564.1,393.6;563.9,394.1;563.7,394.3;563.5,394.5;563.3,394.8;562.8,395.1;562.3,395.4;561.8,395.8;561.3,396.3;560.5,397.1;559.7,397.9;558.8,398.7;558,399.6;557.4,400.4;556.9,401.2;556.4,401.7;555.9,402.2;555.7,402.7;555.4,403.2;555.2,403.6;555,403.8;554.8,404.1;554.5,404.5;554.1,405;553.6,405.4;553.4,405.8|553.4,405.8;553.4,406;553.4,407.6;553.4,410.5;553.4,414.5;553.4,420.3;553.4,428.4;553.4,441.8;554,459.4;555.3,478.7;557.6,502.5;560.1,529.5;562.7,558.9;566.1,588.9;569.5,618.8;572.3,643.6;574.8,664.9;577.7,684.8;579.9,703.9;581.7,725.9;583.8,745.4;585.8,761.8;587.2,776.5;588.5,789.9;589.2,798.7;589.8,805.4;590.3,812.8;590.3,818.7;590.7,823.8;591.1,828.3;591.1,832.2;591.5,836.1;591.9,840;592.2,843.3;592.5,846.7;593,850.8;593.4,854.9;593.4,859;593.4,863.1;593.9,867.8;594.3,872.5;594.7,877;595.1,880.6;595.4,883.7;596,887.5;596.5,891;596.8,893.8;597.2,896.1;597.3,897.9;597.3,898.9;597.3,899.6;597.3,900.1;597.3,900.2;596.8,899.5;595.9,898.6;594.3,897;591.7,894.8;588.5,891.9;584,888.4;578.9,883.8;573.6,878;567.6,872;560.8,865.7;555.4,860.9;551.6,857;542.1,848.8;538.7,845.8;535,842.9;531.3,840.3;527.5,838.2;523.5,836.1;511.3,830.1;503.2,825.2;502.2,824.3;501.3,823.4;500.7,822.5;500.1,822.2;499.9,821.9;499.6,821.7|398.7,519.4;398.5,519.4;399.4,519.4;402.1,519.4;410.2,519.4;423.9,519.4;439.1,519.4;457.1,517.9;478.7,514.9;496.8,512.5;516,510.7;541.2,507.5;566.8,504.4;587.8,503.1;608.7,501.9;632.2,501;653.8,500.2;675.3,499.4;695.4,498.7;713.1,497.9;727,497.9;734.7,497.9;742.4,497.9;751.4,497.9;757.9,497.9;764.4,497.9;770.2,497.9;774.2,497.9;777.6,497.9;781.2,497.9;784.8,497.9;788.4,497.9;791,497.9;793.4,497.9;796.3,497.9;798.2,497.9;799.3,497.9;800.8,497.9;802.2,497.9;803.2,497.9;804.4,497.9;805.7,497.9;807.1,497.9;808.5,497.9;809.8,497.9;811,497.9;812.1,497.9;813.3,497.9;814.1,497.9;814.6,497.9;815.1,497.9;815.6,497.9;816,497.9;816.3,498.1`,
    },
  ];

const negativeShapeContextGraderExamples: readonly ShapeContextGraderExample[] =
  [
    {
      id: `十-synthetic-negative`,
      drawnStrokes: `100,300;924,300|100,724;924,724`,
    },
    {
      id: `好-20261017185501`,
      drawnStrokes: [
        `349.9,190;349.9,190.2;349.9,191.8;349.9,194.6;349.9,201.8;348.7,213.4;346.4,223.8;342.6,237.3;337.1,256.8;330.3,281.2;321.9,310.6;312.3,342.9;301,379.3;289.1,415.6;277.8,447.7;269.3,468.8;262.4,487;254.9,508.1;250.7,517.9;247.9,524.4;243.8,533.1;240.3,540.3;237.4,546.5;235.1,550.9;233.7,554.4;232.8,558;232,561.1;231.2,563.6;230.4,568;229.9,574;229.4,579.8;228.5,587.1;227.7,593.4;226.8,600.5;225.8,609.3;224.3,617.6;222.9,624.4;221.9,630.3;220.5,636.5;219.3,641.8;218.4,646.1;217.6,649.3;216.9,652;216.5,653.6;216,654.8;216,655.1;216,655.7;216,656.4;216.3,658.2;218.3,662.2;223.4,670;232.3,681.3;244.6,696.7;259.4,716.2;291.4,757.1;305.4,776.4;319.1,795.6;331.2,812.4;345.8,832.6;356.5,846.5;363.7,855.9;370.7,865.9;376,872.4;379.8,876.7;381.7,879.1;382.6,880.2;383.4,881;384.1,881.4;384.5,881.8;385,882.1;385.3,882.4`,
        `403.1,493.6;403.1,493.8;403.1,495.2;403.1,498.4;402.7,501.9;401,506.8;398.1,514;393.1,526.3;387.4,540.3;382.6,551;375.6,565.6;367,583.5;359.7,597.2;351.4,612.2;342,630.3;332.9,645.8;323.3,660.5;314.6,674;307.1,685.3;300.3,694.4;294.5,701.7;289.5,708.7;285.2,714.1;280.4,718.5;274.4,724.5;268.4,731.3;263.4,736.9;257.9,742.3;251.4,748.9;244.9,755.8;237.7,763;230.4,770.3;224,777.2;218.4,783.8;214.2,789.1;210.9,792.7;206.1,798.3;201.9,803.6;198.6,807.6;194.7,811.9;191.1,815.6;188,819.1;185.5,821.9;183.3,823.9;181.1,825.8;179,827.3;177.4,828.2;175.9,829.4;174.4,830.3;173.3,830.9;171.8,832.1;170.2,833.2;168.9,833.9;167.3,835;165.2,836.1;163.4,837.1;162.2,837.9;160.4,838.8;158.6,839.8;157.4,840.7;156.2,841.5;155.1,842.1;154,842.6;153.2,843.2;152.8,843.5;152.4,843.7;152,844;151.5,844.2;151.1,844.5;150.8,844.8`,
        `144.5,493;145.3,493;148.2,493;152.6,493;159,493;168.7,493;180.4,493;193.4,493;207.5,493;222.3,493;237.9,493;249.7,493;259.9,493;273.2,493;281.8,493;286.7,493;293.8,493;301.3,493;307,493;311.4,493;316.7,493;321.4,493;324.8,493;327.3,493;330.4,493;333.4,493;336.5,493;339.9,493;343.5,493;347.1,493;350.5,493;354.1,493;357.2,493;359.7,493;362.2,493;364.6,493;366.5,493;368,493;369.9,493;372.1,493;374.5,493;376.6,493;378.1,493;379.7,493;381.1,493;382.3,493;383.5,493;384.7,493;385.9,493;387,493;388.5,493;390,493;391.2,493;392.8,493;394.4,493;395.6,493;396.8,493.2;397.7,493.5;398.3,493.5;398.9,493.8;399.4,494;399.9,494;400.4,494;400.8,494;401.3,494;401.8,494;402,494.2`,
        `550.8,289.4;551.2,289.4;552.8,289.4;557.4,289.4;565.5,289.4;574.3,289.4;586.8,289.4;600.8,289.4;613.8,289.4;628.1,289.4;642.7,289.4;657.2,290;671.1,292.4;683.9,295.4;694.5,297.1;700.7,297.9;711,300.2;717.6,302;723.4,303.5;727.5,304.5;730.3,305.3;732.5,305.7;734.3,306.3;735.2,306.9;735.8,307.1;736.3,307.1;736.8,307.4;737,307.8;737,308.2;737,308.7;737,309.1;737,309.6;737,310.1;736.8,310.5;736.2,310.9;735,311.4;733.3,312;731.1,312.7;728.7,313.6;726.2,314.9;723.2,316.4;719.9,317.9;716.4,319.4;713.3,320.9;710.3,322.4;706.8,324.3;702.1,327.4;697.3,330.4;694.1,332.6;690.7,335.3;686.5,338.7;681,342.8;674.9,347.1;668.3,351.7;660.8,357.5;653.3,363.4;645.7,368.9;637.9,375;632.3,379.6;627.9,383.2;623.9,386.5;619.6,389.9;615.4,393;612.5,394.9;609.6,397.2;607.4,399;605.6,400.4;604.2,401.4;603.3,402.1;602.6,402.7;602.1,403.2;601.6,403.7;601.1,404.2;600.8,404.2;600.8,403.8;600.8,404.4;600.8,406.4;600.8,410.1;600.8,416.7;600.8,424.9;600.8,435.8;601.4,449.4;602.1,469;602.5,487.7;603.1,503.9;603.3,520;603.4,536;604.1,556.2;604.7,576.1;604.9,594.4;605.5,611.1;606.1,625.7;606.8,638.3;607.4,647.2;607.4,653.9;607.4,661.9;607.8,668.5;608.2,674.3;608.2,679.1;608.2,682.8;608.5,686.8;608.8,690.4;608.9,694.2;609,697.8;609,700.5;609,703;609,705.4;609,707.9;609,710.4;609,712.3;609,714.1;609,716;609,717.8;609,719.8;609,721.9;609,723.9;609,726.2;609,729;609,731.6;609,734.2;609,737;609,740.4;609,744;609,747.3;609,750.4;609,753;609,756.4;609,760.2;609,763.7;609,767.3;609,770.8;609,774.5;609,778.5;609,782;609,785.1;609,788.6;609,792.6;609.3,796.6;609.7,800.5;610,803.6;610.3,806.6;610.4,810.5;610.8,814.5;611.2,818.7;611.2,822.8;611.3,826.3;611.3,829;611.3,831.2;611.3,833.2;611.3,835.2;611.3,836.5;611.3,837.3;611.3,838.4;611.3,839.1;611.3,839.5;611.3,839.9;611.3,840.4;611.3,840.6;611,840.2;610.1,839;608.3,836.5;606.1,833.6;603.2,829.7;599.2,824.7;594.6,819.4;589.8,813.7;584.4,807.7;578.8,801.6;573.8,795.7;568.4,790.3;563.8,786.5;559.9,783.4;555.6,779.9;551.2,775.9;547.6,772.6;544.2,769.9;540.4,766.9;536.5,763.8;533,760.9;530.1,758.4;527.3,756;525,754.1;523.3,752.7;521.6,751.4;520,750.1;518.5,748.9;517,747.7;515.5,746.9;514.2,746.2;513,745.2;511.5,744.3;510.3,743.4;509.4,742.5;508.5,741.9;507.6,741.5;507.2,741.2;506.9,740.9;506.4,740.7;506.2,740.3`,
      ].join(`|`),
    },
  ];

async function characterPathsFor(character: string): Promise<string[]> {
  const url = new URL(
    `../../src/client/wiki/${character}/character.json`,
    import.meta.url,
  );
  const parsed = z
    .object({ svg: z.object({ medians: z.array(z.string()) }) })
    .parse(JSON.parse(await readFile(url, `utf8`)));
  return parsed.svg.medians.map(transformArphicSpaceSvgPath);
}

function makeStrokePoints(
  strokes: readonly (readonly WritingStrokePoint[])[],
  transform: (point: WritingStrokePoint) => WritingStrokePoint = (point) =>
    point,
): WritingStrokePoint[][] {
  return strokes.map((stroke) => stroke.map(transform));
}

function pointsForPaths(paths: readonly string[]): WritingStrokePoint[][] {
  return paths.map((path) => {
    const length = SVGPathCommander.getTotalLength(path);
    const pointCount = Math.max(2, Math.ceil(length / 20));
    return Array.from({ length: pointCount }, (_, index) =>
      SVGPathCommander.getPointAtLength(
        path,
        (length * index) / (pointCount - 1),
      ),
    );
  });
}

function expectDrawnStrokesMatchAtMostOneReferenceStroke(
  result: ReturnType<typeof gradeCharacterShape>,
): void {
  const targetStrokeBySource = new Map<number, number>();
  for (const correspondence of result.correspondences) {
    const sourceStroke = result.sourceStrokeIndices[correspondence.sourceIndex];
    const targetStroke = result.targetStrokeIndices[correspondence.targetIndex];
    if (sourceStroke == null || targetStroke == null) {
      throw new Error(`Correspondence is missing sampled stroke membership`);
    }
    const previousTarget = targetStrokeBySource.get(sourceStroke);
    expect(previousTarget == null || previousTarget === targetStroke).toBe(
      true,
    );
    targetStrokeBySource.set(sourceStroke, targetStroke);
  }
}

describe(`gradeCharacterShape`, () => {
  const reference = [
    `M 100 100 L 500 100`,
    `M 300 100 L 300 500`,
    `M 100 300 L 500 300`,
  ];
  const strokes = pointsForPaths(reference);

  test(`matches identical shapes independent of stroke order and direction`, () => {
    const reversed = [...strokes]
      .reverse()
      .map((stroke) => [...stroke].reverse());
    const result = gradeCharacterShape(reversed, reference);
    expect(result.similarity).toBeGreaterThan(0.9);
    expect(result.unmatchedPointPenalty).toBeLessThan(0.02);
    expect(result.correspondences.length).toBeGreaterThan(
      result.sourcePoints.length - 2,
    );
  });

  test(`is invariant to translation and uniform scale`, () => {
    const transformed = makeStrokePoints(strokes, ({ x, y }) => ({
      x: x * 3 + 1200,
      y: y * 3 - 800,
    }));

    const baseline = gradeCharacterShape(strokes, reference);
    const changed = gradeCharacterShape(transformed, reference);
    expect(Math.abs(changed.similarity - baseline.similarity)).toBeLessThan(
      0.03,
    );
  });

  test(`allows small rotations`, () => {
    const radians = (8 * Math.PI) / 180;
    const rotated = makeStrokePoints(strokes, ({ x, y }) => ({
      x: Math.cos(radians) * x - Math.sin(radians) * y,
      y: Math.sin(radians) * x + Math.cos(radians) * y,
    }));

    expect(gradeCharacterShape(rotated, reference).similarity).toBeGreaterThan(
      0.75,
    );
  });

  test(`penalizes rotations outside the allowed range`, () => {
    const radians = Math.PI / 2;
    const rotated = makeStrokePoints(strokes, ({ x, y }) => ({
      x: Math.cos(radians) * x - Math.sin(radians) * y,
      y: Math.sin(radians) * x + Math.cos(radians) * y,
    }));
    const smallRotation = makeStrokePoints(strokes, ({ x, y }) => ({
      x: Math.cos(Math.PI / 24) * x - Math.sin(Math.PI / 24) * y,
      y: Math.sin(Math.PI / 24) * x + Math.cos(Math.PI / 24) * y,
    }));

    const result = gradeCharacterShape(rotated, reference);
    expect(result.similarity).toBeLessThan(
      gradeCharacterShape(smallRotation, reference).similarity - 0.1,
    );
  });

  test(`penalizes moderate shape distortion, missing geometry, and extra geometry`, () => {
    const distorted = makeStrokePoints(strokes, ({ x, y }) => ({
      x: x + (y > 250 ? 90 : 0),
      y,
    }));
    const missing = strokes.slice(0, 2);
    const extra = [
      ...strokes,
      [
        { x: 800, y: 100 },
        { x: 800, y: 500 },
      ],
    ];
    const exact = gradeCharacterShape(strokes, reference);

    expect(
      gradeCharacterShape(distorted, reference).combinedCost,
    ).toBeGreaterThan(exact.combinedCost);
    expect(
      gradeCharacterShape(missing, reference).combinedCost,
    ).toBeGreaterThan(exact.combinedCost);
    expect(gradeCharacterShape(extra, reference).combinedCost).toBeGreaterThan(
      exact.combinedCost,
    );
  });

  test(`assigns a higher cost to a completely different geometry`, () => {
    const differentCharacter = [
      `M 100 100 L 500 500`,
      `M 500 100 L 100 500`,
      `M 300 100 L 300 500`,
    ];
    const exactCost = gradeCharacterShape(strokes, reference).combinedCost;
    const differentCost = gradeCharacterShape(
      pointsForPaths(differentCharacter),
      reference,
    ).combinedCost;

    expect(differentCost).toBeGreaterThan(exactCost + 0.1);
  });

  test(`marks high-cost pairs unmatched instead of forcing correspondences`, () => {
    const result = gradeCharacterShape(
      [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
      ],
      [`M 0 0 L 0 100`],
      { unmatchedCost: 0.01 },
    );

    expect(result.correspondences.length).toBe(0);
    expect(result.unmatchedSourceIndices.length).toBeGreaterThan(0);
    expect(result.unmatchedTargetIndices.length).toBeGreaterThan(0);
  });

  test.for([
    [`土`, `士`],
    [`未`, `末`],
    [`己`, `已`],
    [`人`, `入`],
  ] as const)(
    `distinguishes visually similar reference characters: $0 and $1`,
    async ([character, similarCharacter]) => {
      const [expected, similar] = await Promise.all([
        characterPathsFor(character),
        characterPathsFor(similarCharacter),
      ]);
      const sameCost = gradeCharacterShape(
        pointsForPaths(expected),
        expected,
      ).combinedCost;
      const differentCost = gradeCharacterShape(
        pointsForPaths(expected),
        similar,
      ).combinedCost;

      expect(differentCost).toBeGreaterThan(sameCost);
    },
  );

  test(`returns finite results for empty, duplicate, and short strokes`, () => {
    const cases = [
      gradeCharacterShape([], reference),
      gradeCharacterShape([[]], reference),
      gradeCharacterShape(
        [
          [
            { x: 1, y: 1 },
            { x: 1, y: 1 },
          ],
        ],
        reference,
      ),
      gradeCharacterShape([[{ x: 1, y: 1 }]], reference),
      gradeCharacterShape(strokes, []),
    ];

    for (const result of cases) {
      expect(Number.isFinite(result.similarity)).toBe(true);
      expect(Number.isFinite(result.combinedCost)).toBe(true);
      expect(result.transform.transform({ x: 0, y: 0 })).toMatchObject({
        x: expect.any(Number),
        y: expect.any(Number),
      });
    }
  });

  test(`retains characters with many short strokes within the sample budget`, () => {
    const manyStrokes = Array.from({ length: 40 }, (_, index) => [
      { x: 0, y: index * 10 },
      { x: 100, y: index * 10 },
    ]);
    const manyPaths = manyStrokes.map(
      ([start, end]) => `M ${start?.x} ${start?.y} L ${end?.x} ${end?.y}`,
    );
    const result = gradeCharacterShape(manyStrokes, manyPaths);

    expect(result.sourcePoints.length).toBe(64);
    expect(result.sourceStrokes.length).toBe(40);
  });

  test.for(positiveShapeContextGraderExamples)(
    `accepts positive example $id`,
    async (example) => {
      const referencePaths = await characterPathsFor(
        shapeContextGraderExampleCharacter(example),
      );
      expect(referencePaths.length).toBeGreaterThan(0);
      const result = gradeCharacterShape(
        decodeShapeContextStrokes(example.drawnStrokes),
        referencePaths,
        example.options,
      );
      expectDrawnStrokesMatchAtMostOneReferenceStroke(result);
      expect(
        result.similarity,
        `${example.id}: similarity ${result.similarity.toFixed(3)}, threshold ${hanziCharacterWritingSimilarityThreshold}`,
      ).toBeGreaterThanOrEqual(hanziCharacterWritingSimilarityThreshold);
    },
  );

  test.for(negativeShapeContextGraderExamples)(
    `rejects negative example $id`,
    async (example) => {
      const referencePaths = await characterPathsFor(
        shapeContextGraderExampleCharacter(example),
      );
      const result = gradeCharacterShape(
        decodeShapeContextStrokes(example.drawnStrokes),
        referencePaths,
        example.options,
      );

      expectDrawnStrokesMatchAtMostOneReferenceStroke(result);
      if (example.id === `好-20261017185501`) {
        expect(result.unmatchedStrokePenalty).toBeGreaterThan(0);
      }
      expect(
        result.similarity,
        `${example.id}: similarity ${result.similarity.toFixed(3)}, threshold ${hanziCharacterWritingSimilarityThreshold}`,
      ).toBeLessThan(hanziCharacterWritingSimilarityThreshold);
    },
  );

  test(`round-trips saved examples through JSON and URL fragments`, () => {
    const example = positiveShapeContextGraderExamples[0];
    if (example == null) {
      throw new Error(`Expected a grader example`);
    }
    const exampleWithOptions = {
      ...example,
      options: shapeContextGraderDefaults,
    };

    expect(
      encodeShapeContextStrokes(
        decodeShapeContextStrokes(example.drawnStrokes),
      ),
    ).toBe(example.drawnStrokes);
    expect(encodeShapeContextStrokes([[{ x: 1.26, y: 2.04 }]])).toBe(`1.3,2`);
    expect(
      parseShapeContextGraderExampleJson(
        serializeShapeContextGraderExample(exampleWithOptions),
      ),
    ).toEqual(exampleWithOptions);
    expect(shapeContextGraderExampleCharacter(exampleWithOptions)).toBe(`十`);
    expect(
      parseShapeContextGraderExampleFragment(
        shapeContextGraderExampleFragment(exampleWithOptions),
      ),
    ).toEqual(exampleWithOptions);
  });

  test.for([
    ...positiveShapeContextGraderExamples,
    ...negativeShapeContextGraderExamples,
  ])(`stores $id coordinates to one decimal place`, ({ drawnStrokes }) => {
    expect(drawnStrokes).not.toMatch(/\d+\.\d{2,}/u);
  });

  test(`rejects invalid grader example JSON`, () => {
    const example = positiveShapeContextGraderExamples[0];
    if (example == null) {
      throw new Error(`Expected a grader example`);
    }
    expect(() => parseShapeContextGraderExampleJson(`not json`)).toThrow();
    expect(() =>
      parseShapeContextGraderExampleJson(
        JSON.stringify({
          ...example,
          drawnStrokes: `Infinity,0`,
        }),
      ),
    ).toThrow();
    expect(() => decodeShapeContextStrokes(`1,2;;3,4`)).toThrow();
  });
});
