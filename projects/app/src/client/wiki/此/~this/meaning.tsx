/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p>{"Refers to something close by or just mentioned; equivalent to 'this' in English."}</_components.p>{"\n"}<_components.h2>{"Mnemonic"}</_components.h2>{"\n"}<_components.p>{"Stop! "}<_components.strong>{"This"}</_components.strong>{" is my spoon! Imagine someone pointing at a "}<_components.em>{"匕 (spoon)"}</_components.em>{" and telling someone else to\n"}<_components.em>{"止 (stop)"}</_components.em>{" because it belongs to them."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
