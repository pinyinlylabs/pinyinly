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
        {"To get out of bed; to wake up and rise from sleep; to rise from bed."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                         |\n| -------------- | ---------------------------- |\n| Pinyin         | qǐ chuáng                    |\n| Core meaning   | get up; get out of bed; rise |\n| Part of speech | verb                         |\n| Tone           | third + second tone          |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Word Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"起床 combines "}
        <_components.strong>{"rise + bed"}</_components.strong>
        {" to express the morning routine."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Meaning                                                      |\n| --------- | ------------------------------------------------------------ |\n| "
        }
        <_components.strong>{"起"}</_components.strong>
        {
          "    | Rise; get up; start (indicates upward movement or beginning) |\n| "
        }
        <_components.strong>{"床"}</_components.strong>
        {"    | Bed; sleeping place (the furniture for sleeping)             |"}
      </_components.p>
      {"\n"}
      <_components.h2>{"Understanding"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 起床 as "}
        <_components.strong>{'"rising from the bed"'}</_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"起 (qǐ) shows the action of getting up or rising"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"床 (chuáng) specifies the location - from the bed"}
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "Together they capture the daily transition from sleep to wakefulness"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "The physical act of moving from horizontal (lying) to vertical (standing)"
          }
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Usage Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"我七点起床"}</_components.strong>
          {' (wǒ qī diǎn qǐ chuáng) - "I get up at seven o\'clock"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"该起床了"}</_components.strong>
          {' (gāi qǐ chuáng le) - "it\'s time to get up"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"早起床"}</_components.strong>
          {' (zǎo qǐ chuáng) - "get up early"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"起床气"}</_components.strong>
          {
            ' (qǐ chuáng qì) - "being grumpy when waking up" (wake-up grumpiness)'
          }
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Cultural Context"}</_components.h2>
      {"\n"}
      <_components.p>
        {"起床 is part of daily routine vocabulary:"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"Essential for talking about schedules and habits"}
        </_components.li>
        {"\n"}
        <_components.li>{"Often paired with time expressions"}</_components.li>
        {"\n"}
        <_components.li>
          {"Common in discussions about health and lifestyle"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Used in both formal and informal contexts"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Foundation for understanding other time-related activities"}
        </_components.li>
        {"\n"}
      </_components.ul>
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
