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
          "An event that happens by chance and was not expected; accident; unexpected; surprise."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                           |\n| -------------- | ------------------------------ |\n| Pinyin         | yìwài                          |\n| Core meaning   | accident; unexpected; surprise |\n| Part of speech | noun; adjective; adverb        |\n| Tone           | yì (4th), wài (4th)            |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"意外 combines concepts of intention/meaning and external/outside."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Meaning                                           |\n| --------- | ------------------------------------------------- |\n| "
        }
        <_components.strong>{"意"}</_components.strong>
        {"    | Intention, meaning, thought - heart 心 + sound 音 |\n| "}
        <_components.strong>{"外"}</_components.strong>
        {"    | Outside, external - evening 夕 + divination 卜    |"}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          'The combination suggests something "outside of intention" or beyond what was planned.'
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 意外 as "}
        <_components.strong>
          {'"something outside of what your heart intended"'}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"意 (yì) represents your intention, plan, or what you had in mind"}
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "外 (wài) represents outside, beyond, or external to your expectations"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {"Together: events that fall outside of your intended plans"}
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "Picture carefully planning something, then being surprised by an unexpected event"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {"Like having your day disrupted by something you never saw coming"}
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "The moment when reality goes outside the boundaries of your expectations"
          }
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {"This creates the image: "}
        <_components.strong>
          {
            "events that happen outside the boundaries of what you planned or\nexpected"
          }
        </_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Core Meaning & Usage"}</_components.h2>
      {"\n"}
      <_components.p>
        {"意外 represents "}
        <_components.strong>
          {"unexpected events, both positive and negative surprises"}
        </_components.strong>
        {". It's used:"}
      </_components.p>
      {"\n"}
      <_components.ol>
        {"\n"}
        <_components.li>
          <_components.strong>{"Accidents"}</_components.strong>
          {': 交通意外 (jiāotōng yìwài) - "traffic accident"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Surprises"}</_components.strong>
          {': 意外收获 (yìwài shōuhuò) - "unexpected gain"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Unplanned events"}</_components.strong>
          {': 意外发生 (yìwài fāshēng) - "happened unexpectedly"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"As adverb"}</_components.strong>
          {': 意外地 (yìwài de) - "unexpectedly; by surprise"'}
        </_components.li>
        {"\n"}
      </_components.ol>
      {"\n"}
      <_components.h2>{"Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"意外事故"}</_components.strong>
          {' (yìwài shìgù) - "accident; unexpected incident"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"意外收获"}</_components.strong>
          {' (yìwài shōuhuò) - "unexpected gain/harvest"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"交通意外"}</_components.strong>
          {' (jiāotōng yìwài) - "traffic accident"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"意外惊喜"}</_components.strong>
          {' (yìwài jīngxǐ) - "pleasant surprise"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"很意外"}</_components.strong>
          {' (hěn yìwài) - "very surprising/unexpected"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Cultural Context"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          'In Chinese culture, 意外 reflects the Buddhist and Taoist understanding that life is unpredictable\nand beyond complete human control. While 意外 can refer to negative accidents, it can also describe\npleasant surprises. The concept teaches acceptance that some things are "outside intention" and\nemphasizes the importance of adapting to unexpected circumstances.'
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
