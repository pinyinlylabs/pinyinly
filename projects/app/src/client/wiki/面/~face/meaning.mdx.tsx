// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import { useMDXComponents as _provideComponents } from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(
      Object.create(_provideComponents()),
      props.components,
    ),
    { Example, Examples, Hanzi, Translated } = _components;
  return (
    <>
      <_components.p>
        {"The most basic meaning of "}
        <_components.strong>{"面"}</_components.strong>
        {" is the "}
        <_components.strong>{"face"}</_components.strong>
        {
          " — your actual physical face, or someone’s\nfigurative “face” in a social or emotional sense."
        }
      </_components.p>
      {"\n"}
      <_components.p>
        <_components.strong>{"Examples"}</_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"她的"}
          <_components.strong>{"面"}</_components.strong>
          {"很漂亮。("}
          <_components.em>{"Her face is beautiful."}</_components.em>
          {")"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"他低下了"}
          <_components.strong>{"面"}</_components.strong>
          {"，不敢看我。("}
          <_components.em>
            {"He lowered his face, not daring to look at me."}
          </_components.em>
          {")"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"保住"}
          <_components.strong>{"面"}</_components.strong>
          {"子是他最大的在意。("}
          <_components.em>
            {"Saving face is what he cares most about."}
          </_components.em>
          {")"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {"This is often used with the word "}
        <_components.strong>{"面子"}</_components.strong>
        {" (miànzi), meaning "}
        <_components.strong>{"reputation"}</_components.strong>
        {", "}
        <_components.strong>{"dignity"}</_components.strong>
        {", or "}
        <_components.strong>{"saving\nface"}</_components.strong>
        {", especially in Chinese social culture."}
      </_components.p>
      {"\n"}
      <_components.p>
        {"This is the most literal meaning: "}
        <_components.strong>{"face"}</_components.strong>
        {". It's used for both the physical face and for ideas like\n"}
        <_components.em>{"saving face"}</_components.em>
        {" or "}
        <_components.em>{"losing face"}</_components.em>
        {", which are culturally important in Chinese."}
      </_components.p>
      {"\n"}
      <Examples>
        <Example>
          <Hanzi>{"她的脸上带着微笑。"}</Hanzi>
          <Translated>{"There was a smile on her face."}</Translated>
        </Example>
        <Example>
          <Hanzi>
            {"我不想在大家"}
            <_components.mark className="pyly-mdx-mark pyly-mdx-mark-default">
              {"面"}
            </_components.mark>
            {"前丢面子。"}
          </Hanzi>
          <Translated>
            {"I don't want to lose face in front of everyone."}
          </Translated>
        </Example>
        <Example>
          <Hanzi>
            {"他长得一副苦瓜脸，一点"}
            <_components.mark className="pyly-mdx-mark pyly-mdx-mark-default">
              {"面"}
            </_components.mark>
            {"子都没有。"}
          </Hanzi>
          <Translated>
            {"He always looks so bitter — no dignity at all."}
          </Translated>
        </Example>
        <Example>
          <Hanzi>
            {"请当"}
            <_components.mark className="pyly-mdx-mark pyly-mdx-mark-default">
              {"面"}
            </_components.mark>
            {"告诉我。"}
          </Hanzi>
          <Translated>{"Please tell me face-to-face."}</Translated>
        </Example>
      </Examples>
      {"\n"}
      <_components.p>
        <_components.mark className="pyly-mdx-mark pyly-mdx-mark-default">
          {"面"}
        </_components.mark>
        {" here shows up in words like "}
        <_components.strong>{"面子"}</_components.strong>
        {" (dignity) and "}
        <_components.strong>{"当面"}</_components.strong>
        {" (in person). It's about\n"}
        <_components.strong>{"presentation"}</_components.strong>
        {", "}
        <_components.strong>{"image"}</_components.strong>
        {", and the "}
        <_components.strong>{"front"}</_components.strong>
        {" people see."}
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
function _missingMdxReference(id, component) {
  throw new Error(
    "Expected " +
      (component ? "component" : "object") +
      " `" +
      id +
      "` to be defined: you likely forgot to import, pass, or provide it.",
  );
}
