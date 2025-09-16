// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 救 (jiù)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" jiù"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"j"}</_components.strong>{" like "}<_components.strong>{"\"j\""}</_components.strong>{" in \"jeep\" (but softer, closer to \"zy\")"}</_components.li>{"\n"}<_components.li><_components.strong>{"iù"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee-oo\""}</_components.strong>{", but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"jiù"}</_components.strong>{" sounds like "}<_components.strong>{"\"jee-oo!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"救 (jiù) - \"save, rescue\""}</_components.li>{"\n"}<_components.li>{"救命 (jiù mìng) - \"help! save me!\""}</_components.li>{"\n"}<_components.li>{"救护车 (jiù hù chē) - \"ambulance\""}</_components.li>{"\n"}<_components.li>{"拯救 (zhěng jiù) - \"rescue, save\""}</_components.li>{"\n"}<_components.li>{"获救 (huò jiù) - \"be rescued\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The urgent fourth tone matches the emergency nature of "}<_components.strong>{"救"}</_components.strong>{" - when you need to "}<_components.strong>{"save"}</_components.strong>{" someone,\nit's decisive and urgent!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
