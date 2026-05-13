import { Text } from "react-native";

export function ToneLabelText({ tone }: { tone: number }) {
  return (
    <Text className="font-sans text-fg-dim">
      {tone}
      <Text className="align-super text-[10px]">{ordinalSuffix(tone)}</Text>
    </Text>
  );
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) {
    return `th`;
  }

  switch (n % 10) {
    case 1: {
      return `st`;
    }
    case 2: {
      return `nd`;
    }
    case 3: {
      return `rd`;
    }
    default: {
      return `th`;
    }
  }
}
