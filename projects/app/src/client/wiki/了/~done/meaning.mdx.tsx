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
          "A particle indicating completed action, change of state, or new situation."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                     |\n| -------------- | ------------------------ |\n| Pinyin         | le (neutral tone)        |\n| Core meaning   | completed action; change |\n| Part of speech | particle                 |\n| Tone           | neutral/light tone       |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"了 shows "}
        <_components.strong>{"completion or finishing"}</_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Visual Description                                          |\n| --------- | ----------------------------------------------------------- |\n| "
        }
        <_components.strong>{"了"}</_components.strong>
        {"    | A simplified form showing something being completed or done |"}
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 了 as "}
        <_components.strong>{'"it\'s done" or "finished"'}</_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"The character suggests something coming to an end or completion"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Like putting a period at the end of a sentence"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Shows that an action has been completed or a change has occurred"}
        </_components.li>
        {"\n"}
        <_components.li>
          {'A marker that indicates "this is now different from before"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Usage Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"我吃了"}</_components.strong>
          {' (wǒ chī le) - "I ate" / "I have eaten"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"下雨了"}</_components.strong>
          {' (xià yǔ le) - "It\'s raining" / "It started to rain"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"他来了"}</_components.strong>
          {' (tā lái le) - "He came" / "He has arrived"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"好了"}</_components.strong>
          {' (hǎo le) - "Good!" / "Okay!" / "Done!" / "That\'s enough!"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Grammar Notes"}</_components.h2>
      {"\n"}
      <_components.p>
        {"了 (le) is one of the most important particles in Chinese:"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"Completed action"}</_components.strong>
          {": Shows an action was finished in the past"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Change of state"}</_components.strong>
          {": Indicates a new situation has begun"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Immediate relevance"}</_components.strong>
          {": Often shows something just happened or is now true"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Can appear after verbs or at the end of sentences"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Essential for expressing past events and current situations"}
        </_components.li>
        {"\n"}
        <_components.li>
          {'Different from 了 (liǎo) which means "to finish" as a main verb'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Cultural Context"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "了 reflects the Chinese focus on situational awareness and the importance of knowing when things\nhave changed or been completed - essential for practical communication."
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
