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
          "An account or statement describing in detail an event, situation, or the like, usually as the result\nof observation or inquiry; report; to report."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                    |\n| -------------- | ----------------------- |\n| Pinyin         | bàogào                  |\n| Core meaning   | report; account; inform |\n| Part of speech | noun; verb              |\n| Tone           | bào (4th), gào (4th)    |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"报告 combines concepts of announcement and formal communication."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Meaning                                                  |\n| --------- | -------------------------------------------------------- |\n| "
        }
        <_components.strong>{"报"}</_components.strong>
        {"    | Report, announce - hand radical 扌 + 服 (clothing/serve) |\n| "}
        <_components.strong>{"告"}</_components.strong>
        {"    | Tell, inform - mouth radical 口 + 牛 (cow/declaration)   |"}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "The combination emphasizes both the action of reporting and the formal communication aspect."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 报告 as "}
        <_components.strong>
          {'"using your hands and mouth to formally announce information"'}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"报 (bào) involves using hands to present or deliver information"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"告 (gào) involves using your mouth to speak and inform others"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Together: the complete process of formal information delivery"}
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "Picture a person standing up, holding documents, and speaking to an audience"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "Like a student giving a presentation with visual aids and verbal explanation"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "The official act of both preparing and delivering important information"
          }
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {"This creates the image: "}
        <_components.strong>
          {
            "formally presenting and announcing important information with both\npreparation and speech"
          }
        </_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Core Meaning & Usage"}</_components.h2>
      {"\n"}
      <_components.p>
        {"报告 represents "}
        <_components.strong>
          {"formal reporting, accounts, and official information delivery"}
        </_components.strong>
        {". It's used:"}
      </_components.p>
      {"\n"}
      <_components.ol>
        {"\n"}
        <_components.li>
          <_components.strong>{"Formal presentations"}</_components.strong>
          {': 做报告 (zuò bàogào) - "give a report"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Written documents"}</_components.strong>
          {': 研究报告 (yánjiū bàogào) - "research report"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Verbal reporting"}</_components.strong>
          {': 报告情况 (bàogào qíngkuàng) - "report the situation"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Official announcements"}</_components.strong>
          {': 政府报告 (zhèngfǔ bàogào) - "government report"'}
        </_components.li>
        {"\n"}
      </_components.ol>
      {"\n"}
      <_components.h2>{"Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"研究报告"}</_components.strong>
          {' (yánjiū bàogào) - "research report"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"工作报告"}</_components.strong>
          {' (gōngzuò bàogào) - "work report"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"做报告"}</_components.strong>
          {' (zuò bàogào) - "give a report/presentation"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"报告会"}</_components.strong>
          {' (bàogào huì) - "report meeting; briefing"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"调查报告"}</_components.strong>
          {' (diàochá bàogào) - "investigation report"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Cultural Context"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "报告 is fundamental in Chinese academic, professional, and political contexts. In Chinese\neducational culture, students regularly give 报告 (presentations) to develop communication skills.\nIn government and business, formal 报告 carry significant weight and are expected to be\ncomprehensive and well-prepared. The concept emphasizes accountability and transparency in\ninformation sharing."
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
