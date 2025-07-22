import type { PinyinSoundId } from "@/data/model";
import type { IsExhaustedRest } from "@/util/types";
import { nullIfEmpty } from "@/util/unicode";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

interface PinyinSoundProps {
  id: PinyinSoundId;
  label: string;
  name: string | null;
}

export function PinyinSoundTile({
  id,
  name,
  label,
  ...props
}: PinyinSoundProps) {
  true satisfies IsExhaustedRest<typeof props>;

  const decoration = decorationForSound(id);

  return (
    <View
      {...props}
      className={tileClass({
        hasAssociation: nullIfEmpty(name) != null,
      })}
    >
      <View className="items-center">
        {decoration == null ? null : (
          <Text
            className={`-top-4 h-0 pt-2 text-4xl font-normal leading-none text-fg/20`}
          >
            {decoration}
          </Text>
        )}
        <Text className="text-2xl leading-none text-fg">{label}</Text>
      </View>
      {name == null ? (
        <Text
          className="select-none overflow-visible leading-none text-fg/20"
          numberOfLines={1}
        >
          _____
        </Text>
      ) : (
        <Text
          className="overflow-visible leading-none text-caption"
          numberOfLines={1}
        >
          {name}
        </Text>
      )}
    </View>
  );
}

const tileClass = tv({
  base: `
    size-24 items-center justify-center gap-3 rounded-xl bg-bg-loud p-2

    hover:bg-cyan/20
  `,
  variants: {
    hasAssociation: {
      true: ``,
    },
  },
});

function decorationForSound(soundId: PinyinSoundId): string | null {
  switch (soundId) {
    case `1`: {
      return `¯`;
    }
    case `2`: {
      return `´`;
    }
    case `3`: {
      return `ˇ`;
    }
    case `4`: {
      return `\``;
    }
    case `5`: {
      return ``;
    }
    default: {
      return null;
    }
  }
}
