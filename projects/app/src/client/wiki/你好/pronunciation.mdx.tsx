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
        <_components.strong>{"🗣️ Pronunciation of 你好"}</_components.strong>
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"Pinyin:"}</_components.strong>
          {" nǐ hǎo"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>{"⸻"}</_components.p>
      {"\n"}
      <_components.p>
        <_components.strong>{"🔤 Syllable-by-syllable:"}</_components.strong>
      </_components.p>
      {"\n"}
      <_components.p>
        <_components.strong>{"你 (nǐ)"}</_components.strong>
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"n"}</_components.strong>
          {" – like "}
          <_components.strong>{"“n”"}</_components.strong>
          {" in no"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"ǐ"}</_components.strong>
          {" – sounds like "}
          <_components.strong>{"“ee”"}</_components.strong>
          {" in see, but with the "}
          <_components.strong>{"third tone"}</_components.strong>
          {" → it "}
          <_components.strong>{"dips"}</_components.strong>
          {" down and then rises\nback up."}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Say it like you’re unsure: "}
          <_components.strong>{"“nǐ?”"}</_components.strong>
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        <_components.strong>{"好 (hǎo)"}</_components.strong>
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"h"}</_components.strong>
          {" – like "}
          <_components.strong>{"“h”"}</_components.strong>
          {" in hat"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"ǎo"}</_components.strong>
          {" – sounds a bit like "}
          <_components.strong>{"“how”"}</_components.strong>
          {", but again with the "}
          <_components.strong>{"third tone"}</_components.strong>
          {" → dip down and rise up."}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>{"⸻"}</_components.p>
      {"\n"}
      <_components.p>
        <_components.strong>{"🎧 Tone tip (Third tone: ˇ)"}</_components.strong>
      </_components.p>
      {"\n"}
      <_components.p>
        {"Both "}
        <_components.strong>{"nǐ"}</_components.strong>
        {" and "}
        <_components.strong>{"hǎo"}</_components.strong>
        {" are in the "}
        <_components.strong>{"third tone"}</_components.strong>
        {", which is a "}
        <_components.strong>{"fall–then-rise"}</_components.strong>
        {" tone, like saying\n“uh-huh” when nodding."}
      </_components.p>
      {"\n"}
      <_components.blockquote>
        {"\n"}
        <_components.p>
          {"But when "}
          <_components.strong>{"two third tones"}</_components.strong>
          {" are together, like in "}
          <_components.strong>{"你好"}</_components.strong>
          {", the first one usually becomes a\n"}
          <_components.strong>{"second tone"}</_components.strong>
          {" (rising), so it sounds more like:"}
        </_components.p>
        {"\n"}
      </_components.blockquote>
      {"\n"}
      <_components.p>
        <_components.strong>
          {"🔁 Real-world pronunciation:"}
        </_components.strong>
      </_components.p>
      {"\n"}
      <_components.p>
        <_components.strong>{"ní hǎo"}</_components.strong>
        {" → rising then falling-rising Kind of like: “knee HOW”"}
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
