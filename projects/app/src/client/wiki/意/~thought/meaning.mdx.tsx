// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import { useMDXComponents as _provideComponents } from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(
    Object.create(_provideComponents()),
    props.components,
  );
  return (
    <>
      <_components.p>
        {
          "An abstract concept referring to a thought or idea; meaning; intention; mind; will."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                              |\n| -------------- | --------------------------------- |\n| Pinyin         | yì                                |\n| Core meaning   | meaning; thought; intention; mind |\n| Part of speech | noun                              |\n| Tone           | fourth tone (falling)             |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"意 combines concepts of sound/expression and heart/emotion."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Meaning                                                  |\n| --------- | -------------------------------------------------------- |\n| "
        }
        <_components.strong>{"音"}</_components.strong>
        {"    | Sound, music - representing expression and communication |\n| "}
        <_components.strong>{"心"}</_components.strong>
        {"    | Heart - representing emotions, thoughts, and inner mind  |"}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          'The combination suggests "sounds/expressions from the heart" or thoughts that seek expression.'
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 意 as "}
        <_components.strong>
          {'"the heart\'s voice seeking to express itself"'}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"音 (sound) represents the expression, communication, or voice"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"心 (heart) represents the inner thoughts, feelings, and intentions"}
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "Together: the inner thoughts and feelings that want to be expressed"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {"Picture your heart trying to communicate its deepest thoughts"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Like the moment when inner feelings find their voice"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"The bridge between what you feel inside and what you want to say"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {"This creates the image: "}
        <_components.strong>
          {
            "inner thoughts and feelings finding their voice and seeking expression"
          }
        </_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Core Meaning & Usage"}</_components.h2>
      {"\n"}
      <_components.p>
        {"意 represents "}
        <_components.strong>
          {"thoughts, intentions, meanings, and mental concepts"}
        </_components.strong>
        {". It's used:"}
      </_components.p>
      {"\n"}
      <_components.ol>
        {"\n"}
        <_components.li>
          <_components.strong>{"Meaning"}</_components.strong>
          {': 意思 (yìsi) - "meaning; significance"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Intention"}</_components.strong>
          {': 故意 (gùyì) - "deliberately; on purpose"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Opinion"}</_components.strong>
          {': 意见 (yìjiàn) - "opinion; suggestion"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Attention"}</_components.strong>
          {': 注意 (zhùyì) - "pay attention; notice"'}
        </_components.li>
        {"\n"}
      </_components.ol>
      {"\n"}
      <_components.h2>{"Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"意思"}</_components.strong>
          {' (yìsi) - "meaning; significance; interesting"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"意见"}</_components.strong>
          {' (yìjiàn) - "opinion; suggestion; objection"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"注意"}</_components.strong>
          {' (zhùyì) - "pay attention; be careful"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"故意"}</_components.strong>
          {' (gùyì) - "deliberately; on purpose"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"满意"}</_components.strong>
          {' (mǎnyì) - "satisfied; pleased"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Cultural Context"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "意 is central to Chinese philosophy and communication. In Confucian thought, understanding\nsomeone's 意 (true intention) is crucial for proper relationships. The concept of 意境 (artistic\nconception) in Chinese arts emphasizes the expression of deep meaning beyond surface\nappearances. 意 represents the bridge between inner thought and outer expression, fundamental to\nChinese concepts of understanding and communication."
        }
      </_components.p>
    </>
  );
}
export default function MDXContent(props: any = {}) {
  const { wrapper: MDXLayout } = {
    ..._provideComponents(),
    ...props.components,
  };
  return MDXLayout ? (
    <MDXLayout {...props}>
      <_createMdxContent {...props} />
    </MDXLayout>
  ) : (
    _createMdxContent(props)
  );
}
