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
        {"The number three; the third whole number; a trio or group of three."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                    |\n| -------------- | ----------------------- |\n| Pinyin         | sān                     |\n| Core meaning   | three; trio; third      |\n| Part of speech | number, adjective       |\n| Tone           | first tone (high, flat) |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"三 consists of "}
        <_components.strong>
          {"three parallel horizontal strokes"}
        </_components.strong>
        {", clearly representing the number three."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Visual Description                        |\n| --------- | ----------------------------------------- |\n| "
        }
        <_components.strong>{"三"}</_components.strong>
        {"    | Three horizontal lines stacked vertically |"}
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"The character 三 "}
        <_components.strong>{"visually shows three"}</_components.strong>
        {
          " - imagine three shelves on a wall, three floors of a\nbuilding, or three lines drawn one above the other."
        }
      </_components.p>
      {"\n"}
      <_components.p>{"Think of it as:"}</_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"Three horizon lines (like a layered sunset!)"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Three rulers stacked on top of each other"}
        </_components.li>
        {"\n"}
        <_components.li>{"Three chopsticks laid parallel"}</_components.li>
        {"\n"}
        <_components.li>{"A sandwich with three layers"}</_components.li>
        {"\n"}
        <_components.li>{"Three rungs of a ladder"}</_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Core Meaning & Usage"}</_components.h2>
      {"\n"}
      <_components.p>
        {"三 represents "}
        <_components.strong>
          {"groups of three, the trinity concept, and the number three"}
        </_components.strong>
        {". It's used:"}
      </_components.p>
      {"\n"}
      <_components.ol>
        {"\n"}
        <_components.li>
          <_components.strong>{"As a number"}</_components.strong>
          {': 三个朋友 (sān gè péngyǒu) - "three friends"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"In compounds"}</_components.strong>
          {': 三月 (sān yuè) - "March"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"For ordering"}</_components.strong>
          {': 第三 (dì sān) - "third; number three"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"In expressions"}</_components.strong>
          {': 三思 (sān sī) - "think thrice; consider carefully"'}
        </_components.li>
        {"\n"}
      </_components.ol>
      {"\n"}
      <_components.h2>{"Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"三十"}</_components.strong>
          {' (sān shí) - "thirty"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"三角"}</_components.strong>
          {' (sān jiǎo) - "triangle" (literally "three corners")'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"三明治"}</_components.strong>
          {' (sān míng zhì) - "sandwich"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"星期三"}</_components.strong>
          {' (xīngqī sān) - "Wednesday"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Cultural Notes"}</_components.h2>
      {"\n"}
      <_components.p>
        {"In Chinese culture, three (三) has special significance:"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"三思而后行"}</_components.strong>
          {' - "Think three times before acting" (act cautiously)'}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Many traditional concepts come in threes"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"三 appears in many idioms and expressions about completeness"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Learning Notes"}</_components.h2>
      {"\n"}
      <_components.p>{"三 is essential for:"}</_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>{"All numbers from 13-19, 30-39, etc."}</_components.li>
        {"\n"}
        <_components.li>{"Geometric terms (triangles, etc.)"}</_components.li>
        {"\n"}
        <_components.li>{"Time expressions"}</_components.li>
        {"\n"}
        <_components.li>{"Traditional cultural concepts"}</_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {
          "三 follows the same visual pattern as 一 and 二, making it easy to remember as part of the basic\nnumber sequence."
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
