// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 超 (chāo)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" chāo"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note: "}<_components.strong>{"\"Chao\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"ch"}</_components.strong>{" like "}<_components.strong>{"\"ch\""}</_components.strong>{" in \"church\" (with tongue curled back, aspirated)"}</_components.li>{"\n"}<_components.li><_components.strong>{"āo"}</_components.strong>{" sounds like "}<_components.strong>{"\"ow\""}</_components.strong>{" in \"cow\" but held steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"chāo"}</_components.strong>{" sounds like "}<_components.strong>{"\"chow\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip (First tone: ˉ)"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"first tone"}</_components.strong>{" is "}<_components.strong>{"high and flat"}</_components.strong>{", like holding a steady note:"}</_components.p>{"\n"}<_components.p>{"Say it like you're announcing something super: "}<_components.strong>{"\"chāo—\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"chāo"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"超市 (chāo shì) - \"supermarket\""}</_components.li>{"\n"}<_components.li>{"超过 (chāo guò) - \"exceed; surpass\""}</_components.li>{"\n"}<_components.li>{"超级 (chāo jí) - \"super; ultra\""}</_components.li>{"\n"}<_components.li>{"超越 (chāo yuè) - \"transcend; surpass\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
