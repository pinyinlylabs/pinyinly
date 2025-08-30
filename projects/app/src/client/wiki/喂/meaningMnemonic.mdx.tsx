// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"Character Breakdown"}</_components.strong>{":"}</_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"口"}</_components.strong>{" (mouth radical): relates to speech or actions involving the mouth."}</_components.li>{"\n"}<_components.li><_components.strong>{"畏"}</_components.strong>{" (phonetic component): contributes to pronunciation, not meaning."}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
