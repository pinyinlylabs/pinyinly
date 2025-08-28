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
      <_components.p>{"No more than; exclusively."}</_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        <_components.strong>{"Only"}</_components.strong>
        {" one mouth to feed, not eight! Imagine a person with a single "}
        <_components.em>{"口 (mouth)"}</_components.em>
        {" looking at\n"}
        <_components.em>{"八 (eight)"}</_components.em>
        {
          " hungry people. They can only feed themselves, reinforcing the meaning of "
        }
        <_components.strong>{"only"}</_components.strong>
        {"."}
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
