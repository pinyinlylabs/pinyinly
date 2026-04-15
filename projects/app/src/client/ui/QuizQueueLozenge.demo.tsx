import { SkillQueueContext } from "@/client/ui/contexts";
import { QuizQueueLozenge } from "@/client/ui/QuizQueueLozenge";
import type { SkillReviewQueue } from "@/data/skills";
import { ExampleStack } from "@/client/ui/demo/components";
import { View } from "react-native";

export default () => {
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="loading">
        <SkillQueueContext.Provider value={{ loading: true }}>
          <QuizQueueLozenge />
        </SkillQueueContext.Provider>
      </ExampleStack>

      <ExampleStack title="overdue">
        <DemoQuizQueueLozenge
          reviewQueue={createReviewQueue({ overDueCount: 1 })}
        />
        <DemoQuizQueueLozenge
          reviewQueue={createReviewQueue({ overDueCount: 10 })}
        />
        <DemoQuizQueueLozenge
          reviewQueue={createReviewQueue({ overDueCount: 100 })}
        />
      </ExampleStack>

      <ExampleStack title="due">
        <DemoQuizQueueLozenge
          reviewQueue={createReviewQueue({ dueCount: 1 })}
        />
        <DemoQuizQueueLozenge
          reviewQueue={createReviewQueue({ dueCount: 10 })}
        />
        <DemoQuizQueueLozenge
          reviewQueue={createReviewQueue({ dueCount: 100 })}
        />
      </ExampleStack>

      <ExampleStack title="new">
        <DemoQuizQueueLozenge
          reviewQueue={createReviewQueue({ newContentCount: 1 })}
        />
        <DemoQuizQueueLozenge
          reviewQueue={createReviewQueue({ newContentCount: 10 })}
        />
        <DemoQuizQueueLozenge
          reviewQueue={createReviewQueue({ newContentCount: 100 })}
        />
      </ExampleStack>

      <ExampleStack title="with border">
        <View className="relative size-[32px]">
          <DemoQuizQueueLozenge
            reviewQueue={createReviewQueue({ overDueCount: 3 })}
            className="absolute left-[52%] top-[60%] border-2 border-solid border-bg"
          />
        </View>
      </ExampleStack>
    </View>
  );
};

function DemoQuizQueueLozenge({
  reviewQueue,
  className,
}: {
  reviewQueue: SkillReviewQueue;
  className?: string;
}) {
  return (
    <SkillQueueContext.Provider
      value={{ loading: false, reviewQueue, version: 0 }}
    >
      <QuizQueueLozenge className={className} />
    </SkillQueueContext.Provider>
  );
}

function createReviewQueue({
  overDueCount = 0,
  dueCount = 0,
  newContentCount = 0,
}: {
  overDueCount?: number;
  dueCount?: number;
  newContentCount?: number;
}): SkillReviewQueue {
  return {
    items: [],
    blockedCount: 0,
    retryCount: 0,
    dueCount,
    newContentCount,
    newDifficultyCount: 0,
    newDueAt: null,
    newOverDueAt: null,
    overDueCount,
  };
}
