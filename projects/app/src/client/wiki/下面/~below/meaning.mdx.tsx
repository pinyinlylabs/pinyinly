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
          "Indicates a position that is physically lower; below; underneath; down below."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                     |\n| -------------- | ------------------------ |\n| Pinyin         | xiàmiàn                  |\n| Core meaning   | below; underneath; under |\n| Part of speech | noun, locational phrase  |\n| Tone           | fourth tone + neutral    |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"下面 combines downward direction with surface:"}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Visual Description                                               |\n| --------- | ---------------------------------------------------------------- |\n| "
        }
        <_components.strong>{"下"}</_components.strong>
        {
          "    | Shows downward movement - something descending or positioned low |\n| "
        }
        <_components.strong>{"面"}</_components.strong>
        {
          "    | Face/surface - represents the visible surface or side of things  |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 下面 as "}
        <_components.strong>
          {"the surface that faces downward"}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {
            '下 (down/below) + 面 (face/surface) = the surface that is "down" or "below"'
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {'Like the "underside" or bottom surface of something'}
        </_components.li>
        {"\n"}
        <_components.li>
          {"The surface of something that you can see when looking underneath"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"The bottom side of an object that faces toward the ground"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {"Together they create: "}
        <_components.strong>
          {"the surface/area that is positioned below"}
        </_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Core Meaning & Usage"}</_components.h2>
      {"\n"}
      <_components.p>
        {"下面 indicates "}
        <_components.strong>
          {"the lower position, surface, or area beneath something"}
        </_components.strong>
        {". It's used:"}
      </_components.p>
      {"\n"}
      <_components.ol>
        {"\n"}
        <_components.li>
          <_components.strong>{"Physical location"}</_components.strong>
          {': 桌子下面 (zhuōzi xiàmiàn) - "under the table"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"In documents"}</_components.strong>
          {': 下面写着 (xiàmiàn xiězhe) - "written below"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Sequential order"}</_components.strong>
          {': 下面是 (xiàmiàn shì) - "next is; below is"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"General position"}</_components.strong>
          {': 在下面 (zài xiàmiàn) - "underneath; below"'}
        </_components.li>
        {"\n"}
      </_components.ol>
      {"\n"}
      <_components.h2>{"Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"书在桌子下面"}</_components.strong>
          {' (shū zài zhuōzi xiàmiàn) - "The book is under the table"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"楼下面"}</_components.strong>
          {' (lóu xiàmiàn) - "downstairs; below in the building"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"地下面"}</_components.strong>
          {' (dì xiàmiàn) - "underground; beneath the ground"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"页面下面"}</_components.strong>
          {' (yèmiàn xiàmiàn) - "at the bottom of the page"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"山下面"}</_components.strong>
          {' (shān xiàmiàn) - "at the foot of the mountain"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Usage Notes"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "下面 is more formal than just 下 (xià) and emphasizes the surface or area aspect. It's commonly used\nin:"
        }
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"Describing locations of hidden or supported objects"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Giving directions about where to look"}
        </_components.li>
        {"\n"}
        <_components.li>{"Technical or formal descriptions"}</_components.li>
        {"\n"}
        <_components.li>
          {"Written instructions and documentation"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {
          'Compare with 上面 (shàngmiàn) "above/on top" for the opposite spatial relationship.'
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
