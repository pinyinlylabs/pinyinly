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
        {"The cardinal direction where the sun rises; the Orient; eastern."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                    |\n| -------------- | ----------------------- |\n| Pinyin         | dōng                    |\n| Core meaning   | east; eastern; Orient   |\n| Part of speech | noun, adjective         |\n| Tone           | first tone (high, flat) |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"东 originally depicted "}
        <_components.strong>
          {"the sun rising behind a tree"}
        </_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Visual Description                                           |\n| --------- | ------------------------------------------------------------ |\n| "
        }
        <_components.strong>{"木"}</_components.strong>
        {
          "    | Tree (木) representing the eastern horizon where trees stand |\n| "
        }
        <_components.strong>{"日"}</_components.strong>
        {"    | Sun (日) - originally shown rising through/behind the tree   |"}
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 东 as "}
        <_components.strong>
          {"watching the sunrise through trees"}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {
            "The sun (日) rises in the east, appearing behind trees (木) on the horizon"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {"Early morning light filtering through forest trees facing east"}
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "Standing in a forest and seeing the dawn break through the eastern treeline"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "The combination suggests the direction where daylight first appears"
          }
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {"This creates a vivid image: the "}
        <_components.strong>
          {"eastern direction is where you see the sun rise behind trees"}
        </_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Core Meaning & Usage"}</_components.h2>
      {"\n"}
      <_components.p>
        {"东 represents "}
        <_components.strong>
          {"the cardinal direction east, eastern things, or the Orient"}
        </_components.strong>
        {". It's used:"}
      </_components.p>
      {"\n"}
      <_components.ol>
        {"\n"}
        <_components.li>
          <_components.strong>{"As a direction"}</_components.strong>
          {': 往东走 (wǎng dōng zǒu) - "go east"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Geographic regions"}</_components.strong>
          {': 东方 (dōngfāng) - "the East/Orient"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"In compounds"}</_components.strong>
          {': 东西 (dōngxī) - "things, stuff" (literally "east-west")'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Locations"}</_components.strong>
          {': 东边 (dōngbiān) - "eastern side"'}
        </_components.li>
        {"\n"}
      </_components.ol>
      {"\n"}
      <_components.h2>{"Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"东方"}</_components.strong>
          {' (dōngfāng) - "the East; eastern; Oriental"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"东部"}</_components.strong>
          {' (dōngbù) - "eastern part/region"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"东边"}</_components.strong>
          {' (dōngbiān) - "east side"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"东西"}</_components.strong>
          {' (dōngxī) - "thing; stuff; east and west"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"东南"}</_components.strong>
          {' (dōngnán) - "southeast"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Cultural Context"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          'In Chinese culture, east is considered an auspicious direction as it\'s where the sun rises,\nsymbolizing new beginnings and hope. The term 东方 (dōngfāng) "the East" is often used to refer to\nEast Asian civilization and culture.'
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
