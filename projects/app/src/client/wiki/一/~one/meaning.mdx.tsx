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
        {"The number one; the first and smallest whole number; a single unit."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                    |\n| -------------- | ----------------------- |\n| Pinyin         | yī                      |\n| Core meaning   | one; single; unity      |\n| Part of speech | number, adjective       |\n| Tone           | first tone (high, flat) |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"一 is one of the simplest Chinese characters, consisting of just "}
        <_components.strong>{"one horizontal stroke"}</_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Visual Description       |\n| --------- | ------------------------ |\n| "
        }
        <_components.strong>{"一"}</_components.strong>
        {"    | A single horizontal line |"}
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"The character 一 "}
        <_components.strong>
          {"looks exactly like what it represents"}
        </_components.strong>
        {
          ' - one single horizontal line, like\nholding up one finger horizontally, or drawing a single line to represent the number "1".'
        }
      </_components.p>
      {"\n"}
      <_components.p>{"Think of it as:"}</_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>{"One horizon line across the sky"}</_components.li>
        {"\n"}
        <_components.li>{"One ruler laid flat on a table"}</_components.li>
        {"\n"}
        <_components.li>{"One chopstick lying down"}</_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Core Meaning & Usage"}</_components.h2>
      {"\n"}
      <_components.p>
        {"一 represents the fundamental concept of "}
        <_components.strong>
          {"unity, singularity, and the number one"}
        </_components.strong>
        {". It's used:"}
      </_components.p>
      {"\n"}
      <_components.ol>
        {"\n"}
        <_components.li>
          <_components.strong>{"As a number"}</_components.strong>
          {': 一个苹果 (yī gè píngguǒ) - "one apple"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{'As "a/an"'}</_components.strong>
          {': 一本书 (yī běn shū) - "a book"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"In compounds"}</_components.strong>
          {': 一起 (yīqǐ) - "together" (literally "one together")'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"For emphasis"}</_components.strong>
          {': 一定 (yīdìng) - "definitely" (literally "one fixed")'}
        </_components.li>
        {"\n"}
      </_components.ol>
      {"\n"}
      <_components.h2>{"Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"一天"}</_components.strong>
          {' (yī tiān) - "one day"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"一点"}</_components.strong>
          {' (yī diǎn) - "a little bit"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"一直"}</_components.strong>
          {' (yīzhí) - "straight; all along"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"第一"}</_components.strong>
          {' (dì yī) - "first; number one"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Learning Notes"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "一 is fundamental to Chinese - it appears in countless words and is essential for:"
        }
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>{"Counting and numbers"}</_components.li>
        {"\n"}
        <_components.li>
          {"Measure words (一个, 一本, 一只, etc.)"}
        </_components.li>
        {"\n"}
        <_components.li>{"Time expressions"}</_components.li>
        {"\n"}
        <_components.li>{"Creating compound meanings"}</_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {
          'The tone changes in some combinations (e.g., 一个 is pronounced "yí gè" not "yī gè"), but this is\nlearned naturally through practice.'
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
