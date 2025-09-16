// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 生 (shēng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" shēng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note: "}<_components.strong>{"\"Ahhh\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"sh"}</_components.strong>{" like "}<_components.strong>{"\"sh\""}</_components.strong>{" in \"she\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ēng"}</_components.strong>{" sounds like "}<_components.strong>{"\"ung\""}</_components.strong>{" in \"sung\", but with first tone → steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"shēng"}</_components.strong>{" sounds like "}<_components.strong>{"\"shung\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"生 (shēng) - \"life; born; raw\""}</_components.li>{"\n"}<_components.li>{"生活 (shēng huó) - \"life; to live\""}</_components.li>{"\n"}<_components.li>{"生日 (shēng rì) - \"birthday\""}</_components.li>{"\n"}<_components.li>{"生产 (shēng chǎn) - \"to produce\""}</_components.li>{"\n"}<_components.li>{"学生 (xué shēng) - \"student\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"First tone is like the steady beginning of "}<_components.strong>{"life"}</_components.strong>{" - keep your voice "}<_components.strong>{"flat and high"}</_components.strong>{" throughout\n"}<_components.strong>{"shēng"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
