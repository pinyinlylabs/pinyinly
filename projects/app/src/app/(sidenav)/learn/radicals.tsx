import { QuizDeck } from "@/client/ui/QuizDeck";
import { RectButton2 } from "@/client/ui/RectButton2";
import { useReplicache } from "@/client/ui/ReplicacheContext";
import { generateQuestionForSkillOrThrow } from "@/data/generator";
import { Question, RadicalSkill, SkillType } from "@/data/model";
import { questionsForReview } from "@/data/query";
import { allRadicals } from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function RadicalsPage() {
  const r = useReplicache();

  const newQuizQuery = useQuery({
    // TODO: avoid this being cached and reused when the button is clicked again
    // later
    queryKey: [RadicalsPage.name, `skills`],
    queryFn: async () => {
      const limit = 10;
      const questions: Question[] = (
        await r.replicache.query((tx) =>
          questionsForReview(r, tx, {
            limit,
            sampleSize: 50,
            skillTypes: [
              // SkillType.EnglishToRadical,
              SkillType.RadicalToEnglish,
              SkillType.RadicalToPinyin,
            ],
          }),
        )
      ).map(([, , question]) => question);
      // Fill the rest with new skills
      // Create skills to pad out the rest of the quiz
      if (questions.length < limit) {
        // TODO: could be generated once and cached somewhere.
        const allRadicalSkills: RadicalSkill[] = [];
        for (const radical of await allRadicals()) {
          for (const hanzi of radical.hanzi) {
            for (const name of radical.name) {
              allRadicalSkills.push({
                type: SkillType.RadicalToEnglish,
                hanzi,
                name,
              });
            }
            for (const pinyin of radical.pinyin) {
              allRadicalSkills.push({
                type: SkillType.RadicalToPinyin,
                hanzi,
                pinyin,
              });
            }
          }
        }

        await r.replicache.query(async (tx) => {
          for (const skill of allRadicalSkills) {
            if (!(await r.query.skillState.has(tx, { skill }))) {
              try {
                questions.push(await generateQuestionForSkillOrThrow(skill));
              } catch (e) {
                console.error(e);
                continue;
              }

              if (questions.length === limit) {
                return;
              }
            }
          }
        });
      }

      return questions;
    },
    retry: false,
    throwOnError: true,
    staleTime: Infinity,
    // Preserves referential integrity of returned data, this is important so
    // that `answer` objects are comparable to groups.
    structuralSharing: false,
  });

  return (
    <View className="flex-1 items-center bg-background pt-safe-offset-[20px]">
      {newQuizQuery.isLoading ? (
        <View className="my-auto">
          <Text className="text-text">Loading…</Text>
        </View>
      ) : newQuizQuery.error ? (
        <Text className="text-text">Oops something broken</Text>
      ) : newQuizQuery.isSuccess ? (
        <View className="w-full max-w-[600px] flex-1 items-stretch">
          <QuizDeck questions={newQuizQuery.data} />
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            gap: 16,
            alignItems: `center`,
            justifyContent: `center`,
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          <Text style={{ color: `white`, fontSize: 30, textAlign: `center` }}>
            👏 You’re all caught up on your reviews!
          </Text>
          <GoHomeButton />
        </View>
      )}
    </View>
  );
}

const GoHomeButton = () => (
  <View style={{ height: 44 }}>
    <Link dismissTo href="/learn" asChild>
      <RectButton2 textClassName="font-bold text-text text-xl">
        Back
      </RectButton2>
    </Link>
  </View>
);
