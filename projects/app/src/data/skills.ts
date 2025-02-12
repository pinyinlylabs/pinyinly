import {
  loadHanziDecomposition,
  loadRadicals,
  loadStandardPinyinChart,
  lookupWord,
  parseIds,
  splitPinyin,
  walkIdsNode,
} from "@/dictionary/dictionary";
import { invariant } from "@haohaohow/lib/invariant";
import { HanziSkill, RadicalSkill, Skill, SkillType } from "./model";
import { MarshaledSkill, rSkill } from "./rizzleSchema";

const _skillId = rSkill();
export const skillId = (skill: Skill) => _skillId.marshal(skill);

export interface Node {
  skill: Skill;
  dependencies: Set<MarshaledSkill>; // todo: when are weights added?
}

export type Graph = Map<MarshaledSkill, Node>;

export interface LearningOptions {
  learnNameBeforePinyin?: boolean;
  learnPinyinInitialBeforeFinal?: boolean;
  learnPinyinFinalBeforeTone?: boolean;
}

export async function skillLearningGraph(options: {
  targetSkills: Skill[];
  isSkillLearned: (skill: MarshaledSkill) => boolean;
  learningOptions?: LearningOptions;
}): Promise<Graph> {
  const learningOptions = options.learningOptions ?? {};
  const graph = new Map<MarshaledSkill, Node>();

  async function addSkill(skill: Skill): Promise<void> {
    const id = skillId(skill);

    // Skip over any skills (and its dependency tree) that have already been
    // learned.
    if (options.isSkillLearned(id)) {
      return;
    }

    // Skip doing any work if the skill is already in the graph.
    if (graph.has(id)) {
      return;
    }

    const dependencies = (
      await skillDependencies(skill, learningOptions)
    ).filter((s) => !options.isSkillLearned(skillId(s)));

    const node: Node = {
      skill,
      dependencies: new Set(dependencies.map(skillId)),
    };
    graph.set(id, node);

    for (const dependency of dependencies) {
      await addSkill(dependency);
    }
  }

  for (const skill of options.targetSkills) {
    await addSkill(skill);
  }

  return graph;
}

export async function skillDependencies(
  skill: Skill,
  learningOptions: LearningOptions,
): Promise<Skill[]> {
  const deps: Skill[] = [];
  switch (skill.type) {
    case SkillType.EnglishToRadical:
    case SkillType.PinyinToRadical:
    case SkillType.RadicalToPinyin:
    case SkillType.RadicalToEnglish:
    case SkillType.EnglishToHanzi: {
      // Learn the Hanzi -> English first. It's easier to read than write (for chinese characters).
      const dep: Skill = {
        type: SkillType.HanziWordToEnglish,
        hanzi: skill.hanzi,
      };
      deps.push(dep);
      break;
    }
    case SkillType.HanziWordToEnglish: {
      // Learn the components of a hanzi word first.
      const decompositions = await loadHanziDecomposition();
      const ids = decompositions.get(skill.hanzi);
      if (ids != null) {
        const idsNode = parseIds(ids);
        for (const leaf of walkIdsNode(idsNode)) {
          if (leaf.type === `LeafCharacter` && leaf.character !== skill.hanzi) {
            const radicalName = await ifRadicalReturnName(leaf.character);
            const dep: Skill =
              radicalName != null
                ? {
                    type: SkillType.RadicalToEnglish,
                    hanzi: leaf.character,
                    name: radicalName,
                  }
                : {
                    type: SkillType.HanziWordToEnglish,
                    hanzi: leaf.character,
                  };
            deps.push(dep);
          }
        }
      }
      break;
    }
    case SkillType.HanziWordToPinyinFinal: {
      // Learn the mnemonic associations for the final first.

      // Only do this for single characters
      if (Array.from(skill.hanzi).length > 1) {
        break;
      }

      if (learningOptions.learnPinyinInitialBeforeFinal === true) {
        const dep: Skill = {
          type: SkillType.HanziWordToPinyinInitial,
          hanzi: skill.hanzi,
        };
        deps.push(dep);
      }

      const res = await lookupWord(skill.hanzi);
      if (!res) {
        break;
      }

      const chart = await loadStandardPinyinChart();
      const [pinyin, _] = res.pinyin;

      if (pinyin == null || _ == null) {
        console.error(
          new Error(`there should only be one pinyin for ${skill.hanzi}`),
        );
        break;
      }

      const final = splitPinyin(pinyin, chart)?.[1];
      if (final == null) {
        console.error(
          new Error(`could not extract pinyin final for ${pinyin} `),
        );
        break;
      }

      const dep: Skill = {
        type: SkillType.PinyinFinalAssociation,
        final,
      };
      deps.push(dep);
      break;
    }
    case SkillType.HanziWordToPinyinInitial: {
      // Learn the mnemonic associations for the final first.

      // Only do this for single characters
      if (Array.from(skill.hanzi).length > 1) {
        break;
      }

      const res = await lookupWord(skill.hanzi);
      if (!res) {
        break;
      }

      const chart = await loadStandardPinyinChart();
      const [pinyin, _] = res.pinyin;

      if (pinyin == null || _ == null) {
        console.error(
          new Error(`there should only be one pinyin for ${skill.hanzi}`),
        );
        break;
      }

      const initial = splitPinyin(pinyin, chart)?.[0];
      if (initial == null) {
        console.error(
          new Error(`could not extract pinyin initial for ${pinyin} `),
        );
        break;
      }

      const dep: Skill = {
        type: SkillType.PinyinInitialAssociation,
        initial,
      };
      deps.push(dep);

      break;
    }
    case SkillType.PinyinToHanzi:
      // Learn going from Hanzi -> Pinyin first.
      deps.push({
        type: SkillType.HanziWordToPinyinInitial,
        hanzi: skill.hanzi,
      });
      deps.push({
        type: SkillType.HanziWordToPinyinFinal,
        hanzi: skill.hanzi,
      });
      deps.push({
        type: SkillType.HanziWordToPinyinTone,
        hanzi: skill.hanzi,
      });
      break;
    case SkillType.HanziWordToPinyinTone: {
      // Learn the mnemonic associations for the final first.

      // Only do this for single characters
      if (Array.from(skill.hanzi).length > 1) {
        break;
      }

      if (learningOptions.learnPinyinFinalBeforeTone === true) {
        const dep: Skill = {
          type: SkillType.HanziWordToPinyinFinal,
          hanzi: skill.hanzi,
        };
        deps.push(dep);
      }
      break;
    }
    case SkillType.ImageToHanzi:
    case SkillType.PinyinInitialAssociation:
    case SkillType.PinyinFinalAssociation:
      // Leaf skills (no dependencies).
      break;
  }
  return deps;
}

async function ifRadicalReturnName(
  character: string,
): Promise<string | undefined> {
  return (await loadRadicals()).find((x) => x.hanzi.includes(character))
    ?.name[0];
}

export function radicalToEnglish(hanzi: string, name: string): RadicalSkill {
  return {
    hanzi,
    name,
    type: SkillType.RadicalToEnglish,
  };
}

export function hanziWordToEnglish(hanzi: string): HanziSkill {
  return {
    hanzi,
    type: SkillType.HanziWordToEnglish,
  };
}

export function skillReviewQueue(graph: Graph): MarshaledSkill[] {
  // Kahn topological sort
  const inDegree = new Map<MarshaledSkill, number>();
  const queue: MarshaledSkill[] = [];
  const learningOrder: MarshaledSkill[] = [];

  // Compute in-degree
  for (const [marshaledSkill, node] of graph.entries()) {
    if (!inDegree.has(marshaledSkill)) {
      inDegree.set(marshaledSkill, 0);
    }

    for (const dependency of node.dependencies) {
      inDegree.set(dependency, (inDegree.get(dependency) ?? 0) + 1);
    }
  }

  // Find skills that have no prerequisites
  for (const [skill, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(skill);
    }
  }

  // Process queue
  while (queue.length > 0) {
    const skill = queue.shift();
    invariant(skill != null);
    learningOrder.push(skill);

    const node = graph.get(skill);
    invariant(node != null);
    for (const dependent of node.dependencies) {
      const cur = inDegree.get(dependent);
      invariant(cur != null);
      const newValue = cur - 1;
      inDegree.set(dependent, newValue);
      if (newValue === 0) {
        queue.push(dependent);
      }
    }
  }

  return learningOrder.reverse();
}
