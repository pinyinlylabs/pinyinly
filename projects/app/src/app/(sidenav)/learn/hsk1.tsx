import { questionsForReview } from "@/client/query";
import { QuizDeck } from "@/client/ui/QuizDeck";
import { useReplicache } from "@/client/ui/ReplicacheContext";
import { generateQuestionForSkillOrThrow } from "@/data/generator";
import {
  HanziWordSkill,
  Question,
  QuestionType,
  SkillType,
} from "@/data/model";
import { allHsk1HanziWords } from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { Text, View } from "react-native";

export default function LearnHsk1Page() {
  const r = useReplicache();
  const id = useId();

  const newQuizQuery = useQuery({
    queryKey: [LearnHsk1Page.name, `quiz`, id],
    queryFn: async () => {
      const quizSize = 10;

      const hsk1HanziWords = await allHsk1HanziWords();

      // Start with practicing skills that are due
      const questions: Question[] = await questionsForReview(r, {
        limit: quizSize,
        sampleSize: 50,
        filter: (skill) =>
          `hanziWord` in skill && hsk1HanziWords.includes(skill.hanziWord),
        skillTypes: [SkillType.HanziWordToEnglish],
      }).then((x) => x.map(([_skill, _skillState, question]) => question));

      // Fill the rest with new skills
      // Create skills to pad out the rest of the quiz
      if (questions.length < quizSize) {
        const hsk1Skills: HanziWordSkill[] = [];
        for (const hanziWord of hsk1HanziWords) {
          hsk1Skills.push({
            type: SkillType.HanziWordToEnglish,
            hanziWord,
          });
        }

        await r.replicache.query(async (tx) => {
          for (const skill of hsk1Skills) {
            if (
              // Don't add skills that are already used as answers in the quiz.
              !questions.some(
                (q) =>
                  q.type === QuestionType.OneCorrectPair &&
                  ((`hanziWord` in q.answer.a.skill &&
                    q.answer.a.skill.hanziWord === skill.hanziWord) ||
                    (`hanziWord` in q.answer.b.skill &&
                      q.answer.b.skill.hanziWord === skill.hanziWord)),
              ) &&
              // Don't include skills that are already practiced
              !(await r.query.skillState.has(tx, { skill }))
            ) {
              try {
                questions.push(await generateQuestionForSkillOrThrow(skill));
              } catch (error) {
                console.error(error);
                continue;
              }

              if (questions.length === quizSize) {
                return;
              }
            }
          }
        });
      }

      return questions;
    },
    retry: false,
    // Preserves referential integrity of returned data, this is important so
    // that `answer` objects are comparable to groups.
    structuralSharing: false,
    staleTime: Infinity,
  });

  return (
    <View className="flex-1 items-center bg-background pt-safe-offset-[20px]">
      {newQuizQuery.isLoading ? (
        <View className="my-auto">
          <Text className="text-text">Loading…</Text>
        </View>
      ) : newQuizQuery.error ? (
        <Text className="text-text">Oops something went wrong</Text>
      ) : newQuizQuery.isSuccess ? (
        <QuizDeck questions={newQuizQuery.data} className="h-full w-full" />
      ) : null}
    </View>
  );
}
