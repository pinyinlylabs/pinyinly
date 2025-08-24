// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <_components.p><_components.strong>{"上"}</_components.strong>{" is a common and versatile character in Chinese that generally conveys the idea of "}<_components.strong>{"going\nup"}</_components.strong>{", "}<_components.strong>{"being above"}</_components.strong>{", or "}<_components.strong>{"starting something"}</_components.strong>{"."}</_components.p>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
