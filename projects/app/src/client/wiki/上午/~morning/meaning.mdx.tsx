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
        {"The period of time between midnight and noon."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                    |\n| -------------- | ----------------------- |\n| Pinyin         | shàng wǔ                |\n| Core meaning   | morning; forenoon; A.M. |\n| Part of speech | noun (time expression)  |\n| Tone           | fourth + third tone     |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"上午 combines "}
        <_components.strong>{"up/above"}</_components.strong>
        {" (上) with "}
        <_components.strong>{"noon"}</_components.strong>
        {' (午) to mean "before noon."'}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Visual Description                                      |\n| --------- | ------------------------------------------------------- |\n| "
        }
        <_components.strong>{"上"}</_components.strong>
        {'    | "Up/above" - shows upward movement or higher position   |\n| '}
        <_components.strong>{"午"}</_components.strong>
        {'    | "Noon" - represents the midday sun at its highest point |'}
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 上午 as "}
        <_components.strong>
          {'"before the sun reaches up to noon"'}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"上 suggests the sun is still climbing upward"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"午 represents the peak noon position"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Together: the time when the sun is ascending toward noon"}
        </_components.li>
        {"\n"}
        <_components.li>
          {'Like the "first half" of the sun\'s daily journey'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {
          "Imagine watching the sun climb higher and higher until it reaches its noon peak - that climbing\nperiod is 上午."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Usage Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"上午九点"}</_components.strong>
          {' (shàng wǔ jiǔ diǎn) - "9 A.M."'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"上午好"}</_components.strong>
          {' (shàng wǔ hǎo) - "good morning"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"上午的会议"}</_components.strong>
          {' (shàng wǔ de huìyì) - "morning meeting"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"每天上午"}</_components.strong>
          {' (měi tiān shàng wǔ) - "every morning"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Time System"}</_components.h2>
      {"\n"}
      <_components.p>
        {"上午 is part of the Chinese time division system:"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"上午"}</_components.strong>
          {": Morning (6:00 AM - 12:00 PM)"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"下午"}</_components.strong>
          {": Afternoon (12:00 PM - 6:00 PM)"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"晚上"}</_components.strong>
          {": Evening (6:00 PM - 12:00 AM)"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"夜里"}</_components.strong>
          {": Night (12:00 AM - 6:00 AM)"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Cultural Context"}</_components.h2>
      {"\n"}
      <_components.p>
        {"上午 represents the Chinese approach to time:"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"Clear divisions"}</_components.strong>
          {": Each part of day has distinct character"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Solar reference"}</_components.strong>
          {": Time tied to sun's position"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Productive period"}</_components.strong>
          {": Morning traditionally viewed as most productive time"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Formal meetings"}</_components.strong>
          {": Important business often scheduled 上午"}
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
