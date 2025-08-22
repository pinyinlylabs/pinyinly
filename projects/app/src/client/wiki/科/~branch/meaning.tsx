// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p>{"A branch or field of knowledge, study, or learning."}</_components.p>{"\n"}<_components.h2>{"Mnemonic"}</_components.h2>{"\n"}<_components.p>{"Imagine measuring grain (禾) with a scoop (斗) to organize it into types — this links to the idea of\nclassifying or categorizing, just like school subjects or branches of science."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
