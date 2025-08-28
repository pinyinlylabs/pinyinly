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
        {"Commonly used in "}
        <_components.strong>{"spoken language"}</_components.strong>
        {" to get someone’s attention (especially on the phone)."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "It’s like saying “Hello?” when answering or starting a phone call. It can also be used more sharply\nas “Hey!” when calling out to someone."
        }
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"喂，你好！"}</_components.strong>
          {' — "Hello, hi!"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"喂？你听得到吗？"}</_components.strong>
          {' — "Hello? Can you hear me?"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"喂，你干嘛呢？"}</_components.strong>
          {' — "Hey, what are you doing?"'}
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
