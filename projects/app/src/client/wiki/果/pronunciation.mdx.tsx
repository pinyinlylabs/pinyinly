// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 果 (guǒ)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" guǒ"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"g"}</_components.strong>{" like "}<_components.strong>{"\"g\""}</_components.strong>{" in \"go\""}</_components.li>{"\n"}<_components.li><_components.strong>{"uǒ"}</_components.strong>{" sounds like "}<_components.strong>{"\"wo\""}</_components.strong>{" in \"wo!\", but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"guǒ"}</_components.strong>{" sounds like "}<_components.strong>{"\"gwo\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"果 (guǒ) - \"fruit; result\""}</_components.li>{"\n"}<_components.li>{"苹果 (píng guǒ) - \"apple\""}</_components.li>{"\n"}<_components.li>{"水果 (shuǐ guǒ) - \"fruit\""}</_components.li>{"\n"}<_components.li>{"结果 (jié guǒ) - \"result; outcome\""}</_components.li>{"\n"}<_components.li>{"如果 (rú guǒ) - \"if\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p><_components.strong>{"Fruit"}</_components.strong>{" hangs down then bounces up on a branch — that's the dip-then-rise third tone of "}<_components.strong>{"guǒ"}</_components.strong>{"!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
