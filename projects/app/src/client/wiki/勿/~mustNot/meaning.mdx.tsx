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
          "An imperative particle used to express prohibition or advice against doing something; must not; do\nnot."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                          |\n| -------------- | ----------------------------- |\n| Pinyin         | wù                            |\n| Core meaning   | must not; do not; prohibition |\n| Part of speech | adverb; particle              |\n| Tone           | fourth tone (falling)         |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"勿 represents something being cut off or stopped."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Visual Element   | Description                                  |\n| ---------------- | -------------------------------------------- |\n| "
        }
        <_components.strong>{"Curved line"}</_components.strong>
        {"  | Represents a barrier or prohibition          |\n| "}
        <_components.strong>{"Cross stroke"}</_components.strong>
        {" | Shows cutting off or stopping an action      |\n| "}
        <_components.strong>{"Flowing form"}</_components.strong>
        {" | Suggests movement being halted or redirected |"}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "The character visually suggests the idea of stopping or preventing action."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 勿 as "}
        <_components.strong>
          {'"a flowing action being cut off and stopped"'}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"The curved lines suggest natural flow or movement"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"The crossing strokes represent barriers that stop the flow"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Together: a clear signal to stop, halt, or avoid something"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Picture a flowing river being dammed to stop the water"}
        </_components.li>
        {"\n"}
        <_components.li>
          {'Like a "Do Not Enter" sign that blocks your path'}
        </_components.li>
        {"\n"}
        <_components.li>
          {'The gesture of putting up your hand to say "stop, don\'t do that"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {"This creates the image: "}
        <_components.strong>
          {'a clear barrier that says "do not proceed"'}
        </_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Core Meaning & Usage"}</_components.h2>
      {"\n"}
      <_components.p>
        {"勿 represents "}
        <_components.strong>
          {
            "prohibition, warning against actions, and moral imperatives to avoid something"
          }
        </_components.strong>
        {".\nIt's used:"}
      </_components.p>
      {"\n"}
      <_components.ol>
        {"\n"}
        <_components.li>
          <_components.strong>{"Classical prohibition"}</_components.strong>
          {': 勿忘 (wù wàng) - "do not forget"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Moral guidance"}</_components.strong>
          {
            ": 己所不欲，勿施于人 - \"don't do to others what you don't want done to you\""
          }
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Formal warnings"}</_components.strong>
          {': 勿扰 (wù rǎo) - "do not disturb"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Instructions"}</_components.strong>
          {': 勿碰 (wù pèng) - "do not touch"'}
        </_components.li>
        {"\n"}
      </_components.ol>
      {"\n"}
      <_components.h2>{"Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"勿忘"}</_components.strong>
          {' (wù wàng) - "do not forget"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"勿扰"}</_components.strong>
          {' (wù rǎo) - "do not disturb"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"勿碰"}</_components.strong>
          {' (wù pèng) - "do not touch"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"切勿"}</_components.strong>
          {' (qiè wù) - "must not; never"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"勿用"}</_components.strong>
          {' (wù yòng) - "do not use"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Cultural Context"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "勿 appears in classical Chinese literature and Confucian teachings, often in moral contexts. The\nfamous saying \"己所不欲，勿施于人\" (don't do to others what you don't want done to you) uses 勿 to\nexpress the golden rule. In modern Chinese, 勿 is used in formal signs and instructions, carrying a\nsense of serious prohibition or moral imperative."
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
