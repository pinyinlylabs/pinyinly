// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
import __mdx_import_desk_0 from "./desk.jpg";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.em>{"上"}</_components.em>{" can be used to mean "}<_components.strong>{"on"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p>{"In this context, "}<_components.em>{"上"}</_components.em>{" describes the "}<_components.strong>{"location of something being physically on top of"}</_components.strong>{" something."}</_components.p>{"\n"}<_components.p><_components.img src={__mdx_import_desk_0} alt="" />{" 放在桌子"}<_components.em>{"上"}</_components.em>{" (fàng zài zhuō zi "}<_components.strong>{"shàng"}</_components.strong>{") "}<_components.strong>{"Put on the table"}</_components.strong>{" (literally “put at\ntable-top”)"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
