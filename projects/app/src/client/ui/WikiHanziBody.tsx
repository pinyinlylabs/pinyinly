import type { HanziText } from "@/data/model";
import { isHanziCharacter } from "@/data/hanzi";
import { WikiHanziBodyCharacter } from "./WikiHanziBodyCharacter";
import { WikiHanziBodyWord } from "./WikiHanziBodyWord";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useDb } from "./hooks/useDb";
import { WikiHanziBodyCharacterMultipleMeanings } from "./WikiHanziBodyCharacterMultipleMeanings";
import { WikiPageEditModeProvider } from "./WikiPageEditModeProvider";

export function WikiHanziBody({
  hanzi,
  onModalDismiss,
}: {
  hanzi: HanziText;
  onModalDismiss?: () => void;
}) {
  return (
    <WikiPageEditModeProvider key={hanzi}>
      <WikiHanziBodyContent hanzi={hanzi} onModalDismiss={onModalDismiss} />
    </WikiPageEditModeProvider>
  );
}

function WikiHanziBodyContent({
  hanzi,
  onModalDismiss,
}: {
  hanzi: HanziText;
  onModalDismiss?: () => void;
}) {
  const db = useDb();

  const { data: dictionaryEntries } = useLiveQuery({
    query: (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) => eq(entry.hanzi, hanzi)),
  });

  if (isHanziCharacter(hanzi)) {
    if (dictionaryEntries.length < 2) {
      return (
        <WikiHanziBodyCharacter hanzi={hanzi} onModalDismiss={onModalDismiss} />
      );
    }
    return (
      <WikiHanziBodyCharacterMultipleMeanings
        hanzi={hanzi}
        onModalDismiss={onModalDismiss}
      />
    );
  }

  return <WikiHanziBodyWord hanzi={hanzi} onModalDismiss={onModalDismiss} />;
}
