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
          "A basic vertical line stroke; one of the fundamental building blocks of Chinese characters."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                       |\n| -------------- | -------------------------- |\n| Pinyin         | gǔn (when named as stroke) |\n| Core meaning   | vertical line; stick       |\n| Part of speech | stroke radical             |\n| Usage          | character component        |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"丨 is the simplest possible stroke - "}
        <_components.strong>{"a single vertical line"}</_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Visual Description                          |\n| --------- | ------------------------------------------- |\n| "
        }
        <_components.strong>{"丨"}</_components.strong>
        {"    | A straight vertical line from top to bottom |"}
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 丨 as "}
        <_components.strong>{"a standing stick or pole"}</_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"A simple stick planted vertically in the ground"}
        </_components.li>
        {"\n"}
        <_components.li>{"A pillar or column standing upright"}</_components.li>
        {"\n"}
        <_components.li>{"A single chopstick standing on end"}</_components.li>
        {"\n"}
        <_components.li>
          {"The stroke you make when drawing a straight line down"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {"This represents the fundamental concept of "}
        <_components.strong>
          {"vertical direction and straightness"}
        </_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Core Meaning & Usage"}</_components.h2>
      {"\n"}
      <_components.p>
        {"丨 represents "}
        <_components.strong>
          {"vertical orientation and linear structure"}
        </_components.strong>
        {". It appears in:"}
      </_components.p>
      {"\n"}
      <_components.ol>
        {"\n"}
        <_components.li>
          <_components.strong>{"Basic characters"}</_components.strong>
          {": 十 (ten), 中 (middle), 个 (individual)"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"As a stroke component"}</_components.strong>
          {": Provides vertical structure to characters"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Positional meaning"}</_components.strong>
          {": Often indicates central or supporting elements"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Character balance"}</_components.strong>
          {": Creates symmetry and structure"}
        </_components.li>
        {"\n"}
      </_components.ol>
      {"\n"}
      <_components.h2>{"Examples in Characters"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"十"}</_components.strong>
          {' (shí) - "ten" (vertical line crossed by horizontal)'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"中"}</_components.strong>
          {' (zhōng) - "middle" (vertical line through center)'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"个"}</_components.strong>
          {' (gè) - "individual" (combines with other strokes)'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"小"}</_components.strong>
          {' (xiǎo) - "small" (vertical line with dots)'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"川"}</_components.strong>
          {' (chuān) - "river" (three vertical lines like flowing water)'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"As a Building Block"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "丨 is one of the Eight Basic Strokes (八种基本笔画) in Chinese calligraphy:"
        }
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"It teaches "}
          <_components.strong>{"proper brush control"}</_components.strong>
          {" and "}
          <_components.strong>{"steady hand movement"}</_components.strong>
        </_components.li>
        {"\n"}
        <_components.li>
          {"Represents "}
          <_components.strong>{"strength and stability"}</_components.strong>
          {" in character structure"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Often forms the "}
          <_components.strong>{"backbone"}</_components.strong>
          {" of more complex characters"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {
          "The vertical line is fundamental to understanding how Chinese characters are constructed and\nbalanced."
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
