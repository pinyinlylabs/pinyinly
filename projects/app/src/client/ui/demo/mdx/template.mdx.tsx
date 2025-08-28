// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import { useMDXComponents as _provideComponents } from "@/client/hooks/useMDXComponents";
import { CustomComponent, CustomWrapper } from "./helpers";
function _createMdxContent(props: any) {
  const _components = Object.assign(
    Object.create(_provideComponents()),
    props.components,
  );
  return (
    <>
      <_components.h1>{"Hello World"}</_components.h1>
      {"\n"}
      <_components.p>
        {"I "}
        <_components.strong>{"am"}</_components.strong>
        {" a "}
        <_components.em>{"markdown"}</_components.em>
        {" file!"}
      </_components.p>
      {"\n"}
      <CustomComponent />
      {"\n"}
      <_components.p>
        {"One "}
        <CustomWrapper>
          {"two "}
          <_components.strong>{"three"}</_components.strong>
        </CustomWrapper>
        {" four"}
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
