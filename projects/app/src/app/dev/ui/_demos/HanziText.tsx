import { ExampleStack } from "@/app/dev/ui/_helpers";
import { HanziText } from "@/client/ui/HanziText";

export default () => (
  <>
    <ExampleStack title="hanzi">
      <ExampleStack title="1" showFrame>
        <HanziText hanzi="你好" />
      </ExampleStack>
      <ExampleStack title="2" showFrame>
        <HanziText hanzi="别的" />
      </ExampleStack>
      <ExampleStack title="3" showFrame>
        <HanziText hanzi="乚" />
      </ExampleStack>
    </ExampleStack>

    <ExampleStack title="hanzi + pinyin">
      <ExampleStack title="1" showFrame>
        <HanziText pinyin="nǐhǎo" hanzi="你好" />
      </ExampleStack>
      <ExampleStack title="2" showFrame>
        <HanziText pinyin="bie2 de5" hanzi="别的" />
      </ExampleStack>
      <ExampleStack title="3" showFrame>
        <HanziText pinyin="yǐ" hanzi="乚" />
      </ExampleStack>
    </ExampleStack>

    <ExampleStack title="hanzi + pinyin (underline)">
      <ExampleStack title="1" showFrame>
        <HanziText pinyin="nǐhǎo" hanzi="你好" underline />
      </ExampleStack>
      <ExampleStack title="2" showFrame>
        <HanziText pinyin="bie2 de5" hanzi="别的" underline />
      </ExampleStack>
      <ExampleStack title="3" showFrame>
        <HanziText pinyin="yǐ" hanzi="乚" underline />
      </ExampleStack>
    </ExampleStack>
  </>
);
