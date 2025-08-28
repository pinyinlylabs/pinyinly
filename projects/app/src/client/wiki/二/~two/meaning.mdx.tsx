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
        {"The number two; the second whole number; a pair or couple."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                  |\n| -------------- | --------------------- |\n| Pinyin         | èr                    |\n| Core meaning   | two; pair; second     |\n| Part of speech | number, adjective     |\n| Tone           | fourth tone (falling) |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"二 consists of "}
        <_components.strong>
          {"two parallel horizontal strokes"}
        </_components.strong>
        {", clearly representing the number two."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Visual Description                      |\n| --------- | --------------------------------------- |\n| "
        }
        <_components.strong>{"二"}</_components.strong>
        {"    | Two horizontal lines stacked vertically |"}
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"The character 二 "}
        <_components.strong>{"visually shows two"}</_components.strong>
        {
          " - imagine two shelves on a wall, two floors of a building,\nor two lines drawn one above the other."
        }
      </_components.p>
      {"\n"}
      <_components.p>{"Think of it as:"}</_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"Two horizon lines (maybe a double rainbow!)"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Two rulers stacked on top of each other"}
        </_components.li>
        {"\n"}
        <_components.li>{"Two chopsticks laid parallel"}</_components.li>
        {"\n"}
        <_components.li>
          {'The mathematical "equals" sign (=) rotated 90 degrees'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Core Meaning & Usage"}</_components.h2>
      {"\n"}
      <_components.p>
        {"二 represents "}
        <_components.strong>
          {"duality, pairing, and the number two"}
        </_components.strong>
        {". It's used:"}
      </_components.p>
      {"\n"}
      <_components.ol>
        {"\n"}
        <_components.li>
          <_components.strong>{"As a number"}</_components.strong>
          {': 二个人 (èr gè rén) - "two people"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"In compounds"}</_components.strong>
          {': 二月 (èr yuè) - "February"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"For ordering"}</_components.strong>
          {': 第二 (dì èr) - "second; number two"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"In fractions"}</_components.strong>
          {': 二分之一 (èr fēn zhī yī) - "one half"'}
        </_components.li>
        {"\n"}
      </_components.ol>
      {"\n"}
      <_components.h2>{"Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"二十"}</_components.strong>
          {' (èr shí) - "twenty"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"二手"}</_components.strong>
          {' (èr shǒu) - "second-hand; used"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"二楼"}</_components.strong>
          {' (èr lóu) - "second floor"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"星期二"}</_components.strong>
          {' (xīngqī èr) - "Tuesday"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Learning Notes"}</_components.h2>
      {"\n"}
      <_components.p>{"二 is essential for:"}</_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>{"All numbers from 12-19, 20-29, etc."}</_components.li>
        {"\n"}
        <_components.li>{"Ordering and sequencing"}</_components.li>
        {"\n"}
        <_components.li>
          {"Time expressions (dates, days of week)"}
        </_components.li>
        {"\n"}
        <_components.li>{"Mathematical concepts"}</_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        <_components.strong>{"Note"}</_components.strong>
        {
          ': In some contexts, especially when counting or giving quantities, Chinese speakers often\nuse 两 (liǎng) instead of 二 for "two." For example, "two books" is usually 两本书 (liǎng běn shū)\nrather than 二本书. However, 二 is always used in fixed compounds and number sequences.'
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
