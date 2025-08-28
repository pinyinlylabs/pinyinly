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
          "Something that has a chance of happening; possible; potential; likely."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                       |\n| -------------- | -------------------------- |\n| Pinyin         | kě néng                    |\n| Core meaning   | possible; maybe; potential |\n| Part of speech | adjective, adverb          |\n| Tone           | third + second tone        |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Word Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"可能 combines "}
        <_components.strong>{"able + ability"}</_components.strong>
        {" to express possibility."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Meaning                                                  |\n| --------- | -------------------------------------------------------- |\n| "
        }
        <_components.strong>{"可"}</_components.strong>
        {"    | Can; able; possible (indicates capability or permission) |\n| "}
        <_components.strong>{"能"}</_components.strong>
        {"    | Ability; can; energy (suggests power or capacity to do)  |"}
      </_components.p>
      {"\n"}
      <_components.h2>{"Understanding"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 可能 as "}
        <_components.strong>
          {'"can be able" or "has the ability"'}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {'可 (kě) asks "is it possible?" or "can it be?"'}
        </_components.li>
        {"\n"}
        <_components.li>
          {'能 (néng) confirms "yes, there is ability/capacity"'}
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "Together they express that something is within the realm of possibility"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {'Like saying "it has the potential" or "it\'s capable of happening"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Usage Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"可能下雨"}</_components.strong>
          {' (kě néng xià yǔ) - "it might rain"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"这可能是对的"}</_components.strong>
          {' (zhè kě néng shì duì de) - "this might be correct"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"有可能"}</_components.strong>
          {' (yǒu kě néng) - "it\'s possible" (more emphatic)'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"不可能"}</_components.strong>
          {' (bù kě néng) - "impossible"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Grammar Notes"}</_components.h2>
      {"\n"}
      <_components.p>{"可能 can function as:"}</_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"Adverb"}</_components.strong>
          {': 他可能来 (tā kě néng lái) - "he might come"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Adjective"}</_components.strong>
          {': 这是可能的 (zhè shì kě néng de) - "this is possible"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Noun"}</_components.strong>
          {': 有这种可能 (yǒu zhè zhǒng kě néng) - "there\'s this possibility"'}
        </_components.li>
        {"\n"}
      </_components.ul>
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
