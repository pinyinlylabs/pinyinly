// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 竹 (zhú)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" zhú"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"zh"}</_components.strong>{" like "}<_components.strong>{"\"j\""}</_components.strong>{" in \"junk\" but with tongue curled back"}</_components.li>{"\n"}<_components.li><_components.strong>{"ú"}</_components.strong>{" sounds like "}<_components.strong>{"\"oo\""}</_components.strong>{" in \"too\", but with second tone → rising"}</_components.li>{"\n"}<_components.li><_components.strong>{"zhú"}</_components.strong>{" sounds like "}<_components.strong>{"\"joo?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (ˊ) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Start lower and rise up: "}<_components.strong>{"\"zhú?\""}</_components.strong>{" — like asking \"Bamboo?\" in a questioning tone."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"竹 (zhú) - \"bamboo\""}</_components.li>{"\n"}<_components.li>{"竹子 (zhú zi) - \"bamboo\""}</_components.li>{"\n"}<_components.li>{"竹笋 (zhú sǔn) - \"bamboo shoots\""}</_components.li>{"\n"}<_components.li>{"熊猫吃竹子 (xióng māo chī zhú zi) - \"pandas eat bamboo\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of someone asking "}<_components.strong>{"\"Joo?\""}</_components.strong>{" (bamboo?) with curiosity — the rising second tone matches the\nquestioning intonation!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
