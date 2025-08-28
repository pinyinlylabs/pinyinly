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
          "To end a session of a course of study; class is over; finish class; end of lesson."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                        |\n| -------------- | --------------------------- |\n| Pinyin         | xiàkè                       |\n| Core meaning   | class is over; finish class |\n| Part of speech | verb; phrase                |\n| Tone           | xià (4th), kè (4th)         |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"下课 combines concepts of downward movement and lesson/class."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Meaning                                              |\n| --------- | ---------------------------------------------------- |\n| "
        }
        <_components.strong>{"下"}</_components.strong>
        {"    | Down, below, finish - represents completion/ending   |\n| "}
        <_components.strong>{"课"}</_components.strong>
        {"    | Class, lesson - speech radical 讠+ 果 (fruit/result) |"}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          'The combination suggests "bringing the class down to an end" or "completing the lesson."'
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 下课 as "}
        <_components.strong>
          {'"bringing the lesson down to its conclusion"'}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"下 (xià) represents coming down, finishing, reaching the end"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"课 (kè) represents the class, lesson, or educational session"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Together: the moment when the educational session comes to its end"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Picture the teacher announcing that class time is finished"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Like watching the clock reach the end of the lesson period"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"The relief and excitement when the school bell rings to end class"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {"This creates the image: "}
        <_components.strong>
          {"the satisfying moment when the lesson period officially ends"}
        </_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Core Meaning & Usage"}</_components.h2>
      {"\n"}
      <_components.p>
        {"下课 represents "}
        <_components.strong>
          {"the end of a class period or educational session"}
        </_components.strong>
        {". It's used:"}
      </_components.p>
      {"\n"}
      <_components.ol>
        {"\n"}
        <_components.li>
          <_components.strong>{"Announcement"}</_components.strong>
          {': 现在下课 (xiànzài xiàkè) - "class is over now"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Time reference"}</_components.strong>
          {': 下课后 (xiàkè hòu) - "after class"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Daily schedule"}</_components.strong>
          {': 什么时候下课 (shénme shíhou xiàkè) - "when does class end?"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"School context"}</_components.strong>
          {': 下课铃声 (xiàkè língshēng) - "end-of-class bell"'}
        </_components.li>
        {"\n"}
      </_components.ol>
      {"\n"}
      <_components.h2>{"Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"下课了"}</_components.strong>
          {' (xiàkè le) - "class is over"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"下课后"}</_components.strong>
          {' (xiàkè hòu) - "after class"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"什么时候下课"}</_components.strong>
          {' (shénme shíhou xiàkè) - "when does class end?"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"下课铃"}</_components.strong>
          {' (xiàkè líng) - "end-of-class bell"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"快下课了"}</_components.strong>
          {' (kuài xiàkè le) - "class is almost over"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Cultural Context"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "下课 is a fundamental part of Chinese educational culture, marking the transition from formal\nlearning to break time. In Chinese schools, 下课 periods are important for student social\ninteraction and relaxation. The phrase 下课了 often brings relief and excitement to students,\nmarking freedom from classroom constraints and the beginning of social time or breaks."
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
