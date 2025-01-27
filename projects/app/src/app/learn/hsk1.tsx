import { QuizDeck } from "@/client/ui/QuizDeck";
import { useReplicache } from "@/client/ui/ReplicacheContext";
import { generateQuestionForSkillOrThrow } from "@/data/generator";
import { HanziSkill, Question, QuestionType, SkillType } from "@/data/model";
import { questionsForReview } from "@/data/query";
import { allHsk1Words } from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import isEqual from "lodash/isEqual";
import { useId } from "react";
import { Text, View } from "react-native";

export default function LearnHsk1Page() {
  const r = useReplicache();

  const newQuizQuery = useQuery({
    queryKey: [LearnHsk1Page.name, `quiz`, useId()],
    queryFn: async () => {
      const quizSize = 10;

      const hsk1Words = await allHsk1Words();

      // Start with practicing skills that are due
      const questions: Question[] = (
        await r.replicache.query((tx) =>
          questionsForReview(r, tx, {
            limit: quizSize,
            sampleSize: 50,
            filter: (skill) => hsk1Words.includes(skill.hanzi),
            skillTypes: [SkillType.HanziWordToEnglish],
          }),
        )
      ).map(([, , question]) => question);

      // Fill the rest with new skills
      // Create skills to pad out the rest of the quiz
      if (questions.length < quizSize) {
        const hsk1Skills: HanziSkill[] = [];
        for (const hanzi of hsk1Words) {
          hsk1Skills.push({
            type: SkillType.HanziWordToEnglish,
            hanzi,
          });
        }

        await r.replicache.query(async (tx) => {
          for (const skill of hsk1Skills) {
            if (
              // Don't add skills that are already used as answers in the quiz.
              !questions.some(
                (q) =>
                  q.type === QuestionType.OneCorrectPair &&
                  (isEqual(q.answer.a.skill, skill.hanzi) ||
                    isEqual(q.answer.b.skill, skill.hanzi)),
              ) &&
              // Don't include skills that are already practiced
              !(await r.query.skillState.has(tx, { skill }))
            ) {
              try {
                questions.push(await generateQuestionForSkillOrThrow(skill));
              } catch (e) {
                console.error(e);
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
    throwOnError: true,
  });

  return (
    <View className="flex-1 items-center pt-safe-offset-[20px]">
      {newQuizQuery.isLoading ? (
        <View className="my-auto">
          <Text className="text-text">Loading…</Text>
        </View>
      ) : newQuizQuery.error ? (
        <Text className="text-text">Oops something went wrong</Text>
      ) : newQuizQuery.isSuccess ? (
        <View className="w-full max-w-[600px] flex-1 items-stretch">
          <QuizDeck questions={newQuizQuery.data} />
        </View>
      ) : null}
    </View>
  );
}
