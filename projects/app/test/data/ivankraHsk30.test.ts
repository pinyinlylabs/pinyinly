// pyly-not-src-test

import { sortComparatorString } from "@pinyinly/lib/collections";
import chunk from "lodash/chunk.js";
import { describe, expect, test } from "vitest";
import { loadIvankraHsk30 } from "./ivankraHsk30.ts";

describe(
  `loadIvankraHsk30 suite` satisfies HasNameOf<typeof loadIvankraHsk30>,
  () => {
    test(`loads ivankra hsk30 data`, async () => {
      const entries = await loadIvankraHsk30();
      expect(entries.length).toBeGreaterThan(11_000);
    });

    test(`spot check entries`, async () => {
      const entries = await loadIvankraHsk30();
      expect(entries.find((x) => x.id === `L1-0002`)).toMatchInlineSnapshot(`
        {
          "cedict": "愛好|爱好[ai4 hao4]",
          "example": false,
          "id": "L1-0002",
          "level": "1",
          "ocr": "爱好",
          "pinyin": "àihào",
          "pos": [
            "V",
            "N",
          ],
          "simplified": "爱好",
          "traditional": "愛好",
          "webNo": "21",
          "webPinyin": "àihào",
        }
      `);
    });

    test(`check duplicates`, async () => {
      const entries = await loadIvankraHsk30();

      const actualDuplicates = [];
      const seenHanzi = new Set<string>();
      for (const entry of entries) {
        if (seenHanzi.has(entry.simplified)) {
          actualDuplicates.push(entry.simplified);
        } else {
          seenHanzi.add(entry.simplified);
        }
      }

      expect(chunk(actualDuplicates, 20).map((x) => x.join(` `)))
        .toMatchInlineSnapshot(`
          [
            "地 干 还 谁 倒 得 等 对 多 分 过 好 花 回 会 家 老 老 两 面",
            "那 省 实在 熟 头 下 小 一会儿 站 长 把 白 背 背 重 初 过去 行 叫 精神",
            "了 毛 米 怕 排 任 生 调 头 为 为 信 正 只 啊 别 并 才 出口 次",
            "打 倒车 得 地方 关 好 花 划 火 系 卷 空 哪 批 挑 挺 喂 要 着 支",
            "种 编辑 称 打 封 怪 刻 落 牛 品 散 扇 吐 一下儿 应 本 成 冲 当 副",
            "节 界 局 看 力 料 露 蒙 首 所 土 长 涨 转 转动 族 报 成年 大意 待",
            "担 地道 度 非 缝 该 横 哄 哄 晃 结 结果 尽 圈 麻 码 闷 命 拧 盘",
            "卡 签 且 率 痛 像 则 炸 之 传",
          ]
        `);
    });

    test(`unique on hanzi+pinyin+pos+level`, async () => {
      const entries = await loadIvankraHsk30();
      const seenKeys = new Set<string>();

      for (const entry of entries) {
        const key = `${entry.simplified}::${entry.pinyin}::${entry.pos}::${entry.level}`;
        if (seenKeys.has(key)) {
          expect
            .soft(
              false,
              `duplicate key found: ${entry.id}::${entry.simplified}::${entry.pinyin}::${entry.pos}::${entry.level}`,
            )
            .toBe(true);
        }
        seenKeys.add(key);
      }
    });

    test(`unique on hanzi+pinyin+pos`, async () => {
      const entries = await loadIvankraHsk30();
      const seenKeys = new Set<string>();
      const duplicateHanzi = new Set<string>();

      for (const entry of entries) {
        const key = `${entry.simplified}::${entry.pinyin}::${entry.pos.sort(sortComparatorString()).join(`/`)}`;
        if (seenKeys.has(key)) {
          duplicateHanzi.add(entry.simplified);
        }
        seenKeys.add(key);
      }

      // only one exception.
      expect(duplicateHanzi).toMatchInlineSnapshot(`
        Set {
          "称",
        }
      `);
    });

    test(`keeps expected duplicates and uniques`, async () => {
      const entries = await loadIvankraHsk30();

      for (const [id, count] of [
        [`L1-0118`, 2],
        [`L1-0178`, 2],
        [`L1-0216`, 2],
        [`L1-0224`, 2],
        [`L1-0237`, 2],
        [`L2-0340`, 1],
        [`L2-0500`, 2],
        [`L2-0686`, 2],
        [`L3-0301`, 1],
        [`L7-2799`, 2],
      ] as const) {
        expect
          .soft(
            entries.filter((e) => e.id === id).length,
            `expected ${count} entries for id ${id}`,
          )
          .toBe(count);
      }
    });
  },
);
