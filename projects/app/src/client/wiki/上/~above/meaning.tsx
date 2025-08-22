// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p>{"In this context, "}<_components.em>{"上"}</_components.em>{" describes physical movement toward a higher position — "}<_components.strong>{"climbing"}</_components.strong>{",\n"}<_components.strong>{"rising"}</_components.strong>{", "}<_components.strong>{"boarding"}</_components.strong>{", or "}<_components.strong>{"ascending"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.img src={require("./above.jpg")} alt="" />{" 飞"}<_components.em>{"上"}</_components.em>{"天 (fēi "}<_components.strong>{"shàng"}</_components.strong>{" tiān) "}<_components.strong>{"Fly into the sky"}</_components.strong>{" (literally “Fly up [to] the\nsky”)"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
