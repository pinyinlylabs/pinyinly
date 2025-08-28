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
          "A basic diagonal slash stroke; one of the fundamental building blocks of Chinese characters."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                           |\n| -------------- | ------------------------------ |\n| Pinyin         | piě (when named as stroke)     |\n| Core meaning   | diagonal slash; falling stroke |\n| Part of speech | stroke radical                 |\n| Usage          | character component            |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"丿 is a simple diagonal stroke - "}
        <_components.strong>
          {"a line that falls from upper right to lower left"}
        </_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Visual Description                            |\n| --------- | --------------------------------------------- |\n| "
        }
        <_components.strong>{"丿"}</_components.strong>
        {"    | A diagonal line descending from right to left |"}
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 丿 as "}
        <_components.strong>
          {"something falling or leaning"}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"A stick falling diagonally to the left"}
        </_components.li>
        {"\n"}
        <_components.li>{"Rain falling at an angle"}</_components.li>
        {"\n"}
        <_components.li>
          {"A person leaning forward while walking"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"The natural sweep of a brush stroke moving down and left"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {"This represents the concept of "}
        <_components.strong>
          {"diagonal movement and natural flow"}
        </_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Core Meaning & Usage"}</_components.h2>
      {"\n"}
      <_components.p>
        {"丿 represents "}
        <_components.strong>
          {"diagonal movement and dynamic action"}
        </_components.strong>
        {". It appears in:"}
      </_components.p>
      {"\n"}
      <_components.ol>
        {"\n"}
        <_components.li>
          <_components.strong>{"Basic characters"}</_components.strong>
          {": 人 (person), 入 (enter), 八 (eight)"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"As a stroke component"}</_components.strong>
          {": Provides diagonal structure and movement"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Balancing element"}</_components.strong>
          {": Often paired with opposite diagonal strokes"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Action indication"}</_components.strong>
          {": Suggests movement or direction"}
        </_components.li>
        {"\n"}
      </_components.ol>
      {"\n"}
      <_components.h2>{"Examples in Characters"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"人"}</_components.strong>
          {' (rén) - "person" (two diagonal strokes meeting)'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"入"}</_components.strong>
          {' (rù) - "enter" (diagonal strokes pointing inward)'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"八"}</_components.strong>
          {' (bā) - "eight" (two diagonal strokes spreading apart)'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"火"}</_components.strong>
          {' (huǒ) - "fire" (contains diagonal elements suggesting flames)'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"大"}</_components.strong>
          {' (dà) - "big" (diagonal strokes extending outward)'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"As a Building Block"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "丿 is one of the Eight Basic Strokes (八种基本笔画) in Chinese calligraphy:"
        }
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"It teaches "}
          <_components.strong>{"flowing brush movement"}</_components.strong>
          {" from thick to thin"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Represents "}
          <_components.strong>{"dynamic energy"}</_components.strong>
          {" and "}
          <_components.strong>{"movement"}</_components.strong>
          {" in characters"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Often creates "}
          <_components.strong>{"visual tension"}</_components.strong>
          {" and "}
          <_components.strong>{"balance"}</_components.strong>
          {" with other strokes"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {
          "The diagonal slash is essential for understanding how Chinese characters express movement,\ndirection, and natural flow within their structure."
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
