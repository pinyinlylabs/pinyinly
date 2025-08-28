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
        {"A large and densely populated urban area; city; municipality."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                           |\n| -------------- | ------------------------------ |\n| Pinyin         | chéng shì                      |\n| Core meaning   | city; urban area; municipality |\n| Part of speech | noun                           |\n| Tone           | second + fourth tone           |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Word Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"城市 combines "}
        <_components.strong>{"wall + market"}</_components.strong>
        {" to represent urban centers."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Meaning                                                    |\n| --------- | ---------------------------------------------------------- |\n| "
        }
        <_components.strong>{"城"}</_components.strong>
        {
          "    | City wall; fortress; fortified town (indicates protection) |\n| "
        }
        <_components.strong>{"市"}</_components.strong>
        {"    | Market; marketplace; trading center (indicates commerce)   |"}
      </_components.p>
      {"\n"}
      <_components.h2>{"Understanding"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 城市 as "}
        <_components.strong>
          {'"walled market" or "fortified trading center"'}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {
            "城 (chéng) represents the defensive walls that protected ancient cities"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {"市 (shì) represents the marketplace at the heart of urban life"}
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "Together they capture the essence of cities: protected spaces for trade and community"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {"Like ancient cities that grew around fortified marketplaces"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {
          "This reflects how traditional Chinese cities developed around commercial centers with protective\nwalls."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Usage Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"大城市"}</_components.strong>
          {' (dà chéng shì) - "big city; major city"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"城市生活"}</_components.strong>
          {' (chéng shì shēng huó) - "city life; urban life"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"城市规划"}</_components.strong>
          {' (chéng shì guī huà) - "urban planning"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"小城市"}</_components.strong>
          {' (xiǎo chéng shì) - "small city; town"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Cultural Context"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "城市 represents the concept of urban civilization in Chinese culture:"
        }
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {'Contrasts with 农村 (nóng cūn) "countryside/rural areas"'}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Central to discussions about modernization and development"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Associated with opportunities, education, and progress"}
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "Reflects the historical importance of walled cities in Chinese history"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "Essential for talking about geography, lifestyle, and social development"
          }
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
