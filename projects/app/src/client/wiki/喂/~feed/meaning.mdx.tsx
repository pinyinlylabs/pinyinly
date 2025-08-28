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
          "“To feed” (someone or something). Used when feeding people or animals:"
        }
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"喂猫"}</_components.strong>
          {' — "Feed the cat"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"妈妈在喂宝宝。"}</_components.strong>
          {' — "Mom is feeding the baby."'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"请帮我喂狗。"}</_components.strong>
          {' — "Please help me feed the dog."'}
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
