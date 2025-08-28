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
        {"A sum paid or charged for a service; fee; cost; expense."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                  |\n| -------------- | --------------------- |\n| Pinyin         | fèi                   |\n| Core meaning   | fee; cost; expense    |\n| Part of speech | noun, verb            |\n| Tone           | fourth tone (falling) |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"费 combines "}
        <_components.strong>{"money + flow"}</_components.strong>
        {" to represent expenditure."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Visual Description                                        |\n| --------- | --------------------------------------------------------- |\n| "
        }
        <_components.strong>{"贝"}</_components.strong>
        {
          "    | Shell/money radical (贝) - indicates financial matters    |\n| "
        }
        <_components.strong>{"弗"}</_components.strong>
        {"    | Not/negative (弗) - suggests something going away/leaving |"}
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 费 as "}
        <_components.strong>
          {'"money flowing away" or "wealth leaving"'}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {
            "The money radical (贝) shows this relates to financial transactions"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "The flowing/negative component (弗) suggests money going out or being spent"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {"Like watching money leave your possession in exchange for services"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"The cost or price you pay for something you want or need"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Usage Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"学费"}</_components.strong>
          {' (xuéfèi) - "tuition; school fees"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"费用"}</_components.strong>
          {' (fèi yòng) - "cost; expense; fee"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"免费"}</_components.strong>
          {' (miǎn fèi) - "free of charge; no fee"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"浪费"}</_components.strong>
          {' (làng fèi) - "waste; squander"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Cultural Context"}</_components.h2>
      {"\n"}
      <_components.p>
        {"费 is essential for discussing economic matters:"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"Used in all types of financial transactions"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Important for travel, education, and business"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Often paired with specific activity words to specify fee types"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Reflects practical concerns about cost and value in daily life"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Central to budgeting and financial planning discussions"}
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
