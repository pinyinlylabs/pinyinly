import { ExampleStack } from "@/client/ui/demo/helpers";
import { QuizQueueButton } from "@/client/ui/QuizQueueButton";
import { View } from "react-native";

export default () => {
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="loading">
        <QuizQueueButton queueStats={null} />
      </ExampleStack>

      <ExampleStack title="overdue">
        <QuizQueueButton
          queueStats={{ overDueCount: 1, dueCount: 0, newContentCount: 0 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 10, dueCount: 0, newContentCount: 0 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 100, dueCount: 0, newContentCount: 0 }}
        />
      </ExampleStack>

      <ExampleStack title="due">
        <QuizQueueButton
          queueStats={{ overDueCount: 0, dueCount: 1, newContentCount: 0 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 0, dueCount: 10, newContentCount: 0 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 0, dueCount: 100, newContentCount: 0 }}
        />
      </ExampleStack>

      <ExampleStack title="new">
        <QuizQueueButton
          queueStats={{ overDueCount: 0, dueCount: 0, newContentCount: 1 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 0, dueCount: 0, newContentCount: 10 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 0, dueCount: 0, newContentCount: 100 }}
        />
      </ExampleStack>

      <ExampleStack title="combinations">
        <QuizQueueButton
          queueStats={{ overDueCount: 5, dueCount: 3, newContentCount: 0 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 2, dueCount: 0, newContentCount: 4 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 0, dueCount: 7, newContentCount: 2 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 3, dueCount: 5, newContentCount: 8 }}
        />
      </ExampleStack>
    </View>
  );
};
