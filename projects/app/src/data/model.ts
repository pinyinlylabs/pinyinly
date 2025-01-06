import { Rating } from "@/util/fsrs";

export enum SrsType {
  Null,
  FsrsFourPointFive,
}

export interface SrsNullState {
  type: SrsType.Null;
}

export interface SrsFourPointFiveState {
  type: SrsType.FsrsFourPointFive;
  stability: number;
  difficulty: number;
}

export type SrsState = SrsNullState | SrsFourPointFiveState;

// TODO: "SkillUpcomingReview" maybe?
export interface SkillState {
  // TODO: this shoudl be "last reviewed"
  createdAt: Date;
  /** When null, it means it's never been reviewed. */
  srs: SrsState | null;
  due: Date;
}

export interface SkillRating {
  rating: Rating;
}

export enum SkillType {
  RadicalToEnglish,
  EnglishToRadical,
  RadicalToPinyin,
  PinyinToRadical,
  HanziWordToEnglish,
  HanziWordToPinyinInitial,
  HanziWordToPinyinFinal,
  HanziWordToPinyinTone,
  EnglishToHanzi,
  PinyinToHanzi,
  ImageToHanzi,
}

export interface HanziSkill {
  type:
    | SkillType.HanziWordToEnglish
    | SkillType.HanziWordToPinyinInitial
    | SkillType.HanziWordToPinyinFinal
    | SkillType.HanziWordToPinyinTone
    | SkillType.EnglishToHanzi
    | SkillType.PinyinToHanzi
    | SkillType.ImageToHanzi;
  hanzi: string;
}

export interface RadicalNameSkill {
  type: SkillType.RadicalToEnglish | SkillType.EnglishToRadical;
  hanzi: string;
  name: string;
}

export interface RadicalPinyinSkill {
  type: SkillType.RadicalToPinyin | SkillType.PinyinToRadical;
  hanzi: string;
  pinyin: string;
}

export type RadicalSkill = RadicalNameSkill | RadicalPinyinSkill;

/** Data that forms the unique key for a skill */
export type Skill = HanziSkill | RadicalSkill;

export enum QuestionFlag {
  WeakWord,
  PreviousMistake,
}

export enum QuestionType {
  MultipleChoice,
  OneCorrectPair,
}

export interface MultipleChoiceQuestion {
  type: QuestionType.MultipleChoice;
  prompt: string;
  answer: string;
  flag?: QuestionFlag;
  choices: readonly string[];
}

export interface SkillRating {
  skill: Skill;
  rating: Rating;
}

// export interface OneCorrectPairQuestionRadicalAnswer {
//   type: `radical`;
//   hanzi: string;
//   nameOrPinyin: string;
// }

// export interface OneCorrectPairQuestionWordAnswer {
//   type: `word`;
//   hanzi: string;
//   definition: string;
// }

export type OneCorrectPairQuestionChoice =
  | {
      type: `radical`;
      hanzi: string;
      skill?: Skill;
    }
  | {
      type: `hanzi`;
      hanzi: string;
      skill?: Skill;
    }
  | {
      type: `name`;
      english: string;
      skill?: Skill;
    }
  | {
      type: `pinyin`;
      pinyin: string;
      skill?: Skill;
    }
  | {
      type: `definition`;
      english: string;
      skill?: Skill;
    };

export interface OneCorrectPairQuestionAnswer {
  a: OneCorrectPairQuestionChoice;
  b: OneCorrectPairQuestionChoice;
}

export interface OneCorrectPairQuestion {
  type: QuestionType.OneCorrectPair;
  prompt: string;
  answer: OneCorrectPairQuestionAnswer;
  groupA: readonly OneCorrectPairQuestionAnswer[];
  groupB: readonly OneCorrectPairQuestionAnswer[];
  hint?: string;
  flag?: QuestionFlag;
}

export type Question = MultipleChoiceQuestion | OneCorrectPairQuestion;

export interface PinyinInitialAssociation {
  initial: string;
  name: string;
}
