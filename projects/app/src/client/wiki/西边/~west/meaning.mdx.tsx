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
        {"The west part of a certain area; west side; western area."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                    |\n| -------------- | ----------------------- |\n| Pinyin         | xībiān                  |\n| Core meaning   | west side; western area |\n| Part of speech | noun                    |\n| Tone           | xī (1st), biān (1st)    |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"西边 combines the direction west with the concept of side/boundary."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Meaning                                                                 |\n| --------- | ----------------------------------------------------------------------- |\n| "
        }
        <_components.strong>{"西"}</_components.strong>
        {
          "    | West - originally a bird's nest, suggesting the setting sun's direction |\n| "
        }
        <_components.strong>{"边"}</_components.strong>
        {
          "    | Side, edge, border - movement radical 辶 + 力 (strength)                |"
        }
      </_components.p>
      {"\n"}
      <_components.p>
        {
          'The combination means "the side that faces west" or "the western boundary."'
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 西边 as "}
        <_components.strong>
          {'"the side where the sun sets and birds return to nest"'}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {
            "西 (xī) represents the west direction, where the sun sets in the evening"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {"边 (biān) represents a side, edge, or boundary area"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Together: the side/area that faces toward the setting sun"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Picture the side of a building that gets evening sunlight"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Like the edge of your property that faces the sunset"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"The boundary area where the day ends and evening begins"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {"This creates the image: "}
        <_components.strong>
          {"the boundary or area that faces toward the setting sun"}
        </_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Core Meaning & Usage"}</_components.h2>
      {"\n"}
      <_components.p>
        {"西边 represents "}
        <_components.strong>
          {"the western side, area, or direction relative to a reference point"}
        </_components.strong>
        {". It's used:"}
      </_components.p>
      {"\n"}
      <_components.ol>
        {"\n"}
        <_components.li>
          <_components.strong>{"Location description"}</_components.strong>
          {': 在西边 (zài xībiān) - "on the west side"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Directional reference"}</_components.strong>
          {': 房子西边 (fángzi xībiān) - "west side of the house"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Geographic areas"}</_components.strong>
          {': 城市西边 (chéngshì xībiān) - "western part of the city"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Relative position"}</_components.strong>
          {': 往西边走 (wǎng xībiān zǒu) - "go toward the west side"'}
        </_components.li>
        {"\n"}
      </_components.ol>
      {"\n"}
      <_components.h2>{"Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"房子西边"}</_components.strong>
          {' (fángzi xībiān) - "west side of the house"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"城市西边"}</_components.strong>
          {' (chéngshì xībiān) - "western part of the city"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"在西边"}</_components.strong>
          {' (zài xībiān) - "on the west side"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"西边的山"}</_components.strong>
          {' (xībiān de shān) - "the mountains to the west"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"往西边"}</_components.strong>
          {' (wǎng xībiān) - "toward the west side"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Cultural Context"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "In Chinese culture and feng shui, the 西边 (west side) is associated with the setting sun and the\nend of the day. In traditional Chinese architecture, the west-facing areas often receive strong\nafternoon sun, making 西边 important for planning building orientation. The west is also\nsymbolically associated with autumn and maturity in Chinese five-element theory."
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
