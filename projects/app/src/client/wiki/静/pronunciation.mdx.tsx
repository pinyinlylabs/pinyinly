// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 静 (jìng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" jìng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"j"}</_components.strong>{" like "}<_components.strong>{"\"j\""}</_components.strong>{" in \"jeep\" (but softer, more like \"gee\")"}</_components.li>{"\n"}<_components.li><_components.strong>{"ìng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ing\""}</_components.strong>{" in \"sing\", but with fourth tone → sharp falling"}</_components.li>{"\n"}<_components.li><_components.strong>{"jìng"}</_components.strong>{" sounds like "}<_components.strong>{"\"jing!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"静 (jìng) - \"quiet\""}</_components.li>{"\n"}<_components.li>{"安静 (ān jìng) - \"peaceful; quiet\""}</_components.li>{"\n"}<_components.li>{"平静 (píng jìng) - \"calm; tranquil\""}</_components.li>{"\n"}<_components.li>{"静止 (jìng zhǐ) - \"still; motionless\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"sharp falling tone"}</_components.strong>{" is like a firm \"Shh!\" command for quiet — "}<_components.strong>{"jìng"}</_components.strong></_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
