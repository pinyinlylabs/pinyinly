/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"Decomposition:"}</_components.strong>{" "}<_components.code>{"⿱丷⿻甲一"}</_components.code></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"丷"}</_components.strong>{" – two small strokes (like little horns)"}</_components.li>{"\n"}<_components.li><_components.strong>{"甲"}</_components.strong>{" – armor or shell (a chestplate or beetle shell)"}</_components.li>{"\n"}<_components.li><_components.strong>{"一"}</_components.strong>{" – one"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Mnemonic"}</_components.strong></_components.p>{"\n"}<_components.blockquote>{"\n"}<_components.p>{"Imagine a "}<_components.strong>{"single soldier"}</_components.strong>{" standing alone on the battlefield."}<_components.br />{"\n"}{"He wears a "}<_components.strong>{"shell of armor (甲)"}</_components.strong>{" and is marked with a "}<_components.strong>{"single line (一)"}</_components.strong>{" for rank."}<_components.br />{"\n"}{"Above his helmet are "}<_components.strong>{"two decorative horns (丷)"}</_components.strong>{" — he looks strong but "}<_components.strong>{"stands alone"}</_components.strong>{"."}</_components.p>{"\n"}</_components.blockquote>{"\n"}<_components.p>{"He’s the "}<_components.strong>{"only one left"}</_components.strong>{" — the "}<_components.strong>{"single survivor"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"🪛 Meaning connection"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"一"}</_components.strong>{" = one"}</_components.li>{"\n"}<_components.li><_components.strong>{"甲"}</_components.strong>{" = strong individual (armor = standout)"}</_components.li>{"\n"}<_components.li><_components.strong>{"丷"}</_components.strong>{" = distinctive horns = unique"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p>{"Altogether: a uniquely marked, armored "}<_components.strong>{"individual"}</_components.strong>{" — meaning "}<_components.strong>{"“single”"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
