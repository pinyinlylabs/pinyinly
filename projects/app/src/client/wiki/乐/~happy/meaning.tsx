/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p>{"Feeling or showing pleasure or contentment."}</_components.p>{"\n"}<_components.h2>{"Mnemonic"}</_components.h2>{"\n"}<_components.p>{"Top: decorative strokes (originally part of 樂‚ ancient form) Bottom: 木 tree (wood)"}</_components.p>{"\n"}<_components.p>{"Originally 乐 was a shorthand form of 樂, which depicted "}<_components.strong>{"a stand holding bells and musical\ninstruments made of wood"}</_components.strong>{" — symbolizing "}<_components.strong>{"music and joy"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
