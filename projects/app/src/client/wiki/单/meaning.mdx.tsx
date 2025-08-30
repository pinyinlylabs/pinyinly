// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"单"}</_components.strong>{" (dān) means "}<_components.strong>{"single"}</_components.strong>{", "}<_components.strong>{"alone"}</_components.strong>{", or "}<_components.strong>{"one"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p>{"It’s used to describe something that stands by itself — like a single item, a solo person, or an\nindividual thing. You'll see it in words like:"}</_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"单人"}</_components.strong>{" (dān rén) — single person"}</_components.li>{"\n"}<_components.li><_components.strong>{"单数"}</_components.strong>{" (dān shù) — odd number"}</_components.li>{"\n"}<_components.li><_components.strong>{"菜单"}</_components.strong>{" (cài dān) — menu (a “list” of individual dishes)"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p>{"It carries the idea of "}<_components.strong>{"simplicity"}</_components.strong>{", "}<_components.strong>{"solitude"}</_components.strong>{", or being "}<_components.strong>{"non-combined"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
