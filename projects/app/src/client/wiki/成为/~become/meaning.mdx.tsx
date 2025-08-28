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
          "To change or develop into; to become; to turn into; to transform into."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                       |\n| -------------- | -------------------------- |\n| Pinyin         | chéng wéi                  |\n| Core meaning   | become; turn into; develop |\n| Part of speech | verb                       |\n| Tone           | second + second tone       |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Word Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"成为 combines "}
        <_components.strong>{"accomplish + become"}</_components.strong>
        {" to express transformation."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Meaning                                                          |\n| --------- | ---------------------------------------------------------------- |\n| "
        }
        <_components.strong>{"成"}</_components.strong>
        {
          "    | Complete; accomplish; succeed (indicates completion/achievement) |\n| "
        }
        <_components.strong>{"为"}</_components.strong>
        {
          "    | Become; be; for (indicates transformation or state)              |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Understanding"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 成为 as "}
        <_components.strong>
          {'"accomplish becoming" or "complete the transformation"'}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"成 (chéng) suggests successfully completing a process"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"为 (wéi) indicates the state or identity being achieved"}
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "Together they express the successful completion of becoming something"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {"Like reaching the final stage of a transformation process"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Usage Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"成为朋友"}</_components.strong>
          {' (chéng wéi péng yǒu) - "become friends"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"成为老师"}</_components.strong>
          {' (chéng wéi lǎo shī) - "become a teacher"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"成为问题"}</_components.strong>
          {' (chéng wéi wèn tí) - "become a problem"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"将要成为"}</_components.strong>
          {' (jiāng yào chéng wéi) - "will become; about to become"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Grammar Notes"}</_components.h2>
      {"\n"}
      <_components.p>
        {"成为 is used to express transformation or change of state:"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"Often indicates a deliberate or gradual process of change"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Can be used with past, present, or future time references"}
        </_components.li>
        {"\n"}
        <_components.li>
          {'More formal than simple 是 (shì) "to be"'}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Emphasizes the process or achievement of reaching a new state"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Common in both everyday speech and formal writing"}
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
