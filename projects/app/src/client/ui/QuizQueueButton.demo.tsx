import { ExampleStack } from "@/client/ui/demo/helpers";
import { QuizQueueButton } from "@/client/ui/QuizQueueButton";
import { View } from "react-native";

export default () => {
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="loading">
        <QuizQueueButton queueStats={null} />
      </ExampleStack>

      <ExampleStack title="retry only">
        <QuizQueueButton
          queueStats={{
            retryCount: 1,
            overDueCount: 0,
            dueCount: 0,
            newContentCount: 0,
          }}
        />
        <QuizQueueButton
          queueStats={{
            retryCount: 10,
            overDueCount: 0,
            dueCount: 0,
            newContentCount: 0,
          }}
        />
      </ExampleStack>

      <ExampleStack title="overdue only">
        <QuizQueueButton
          queueStats={{
            retryCount: 0,
            overDueCount: 1,
            dueCount: 0,
            newContentCount: 0,
          }}
        />
        <QuizQueueButton
          queueStats={{
            retryCount: 0,
            overDueCount: 10,
            dueCount: 0,
            newContentCount: 0,
          }}
        />
      </ExampleStack>

      <ExampleStack title="due only">
        <QuizQueueButton
          queueStats={{
            retryCount: 0,
            overDueCount: 0,
            dueCount: 1,
            newContentCount: 0,
          }}
        />
        <QuizQueueButton
          queueStats={{
            retryCount: 0,
            overDueCount: 0,
            dueCount: 10,
            newContentCount: 0,
          }}
        />
      </ExampleStack>

      <ExampleStack title="new only">
        <QuizQueueButton
          queueStats={{
            retryCount: 0,
            overDueCount: 0,
            dueCount: 0,
            newContentCount: 1,
          }}
        />
        <QuizQueueButton
          queueStats={{
            retryCount: 0,
            overDueCount: 0,
            dueCount: 0,
            newContentCount: 10,
          }}
        />
      </ExampleStack>

      <ExampleStack title="mixed">
        <QuizQueueButton
          queueStats={{
            retryCount: 1,
            overDueCount: 2,
            dueCount: 3,
            newContentCount: 4,
          }}
        />
        <QuizQueueButton
          queueStats={{
            retryCount: 5,
            overDueCount: 10,
            dueCount: 15,
            newContentCount: 20,
          }}
        />
        <QuizQueueButton
          queueStats={{
            retryCount: 0,
            overDueCount: 5,
            dueCount: 0,
            newContentCount: 10,
          }}
        />
      </ExampleStack>
    </View>
  );
};
