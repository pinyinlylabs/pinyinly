// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p>{"To take or get something."}</_components.p>{"\n"}<_components.h2>{"Mnemonic"}</_components.h2>{"\n"}<_components.p>{"Imagine someone using their "}<_components.em>{"ear"}</_components.em>{" (耳) to "}<_components.em>{"get"}</_components.em>{" information, and then they need to listen "}<_components.em>{"again"}</_components.em>{"\n(又) for more details. This relates to the idea of "}<_components.em>{"taking"}</_components.em>{" or "}<_components.em>{"getting"}</_components.em>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
