// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 修 (xiū)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" xiū"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"x"}</_components.strong>{" like "}<_components.strong>{"\"sh\""}</_components.strong>{" in \"she\" (but with tongue tip down)"}</_components.li>{"\n"}<_components.li><_components.strong>{"iū"}</_components.strong>{" sounds like "}<_components.strong>{"\"yo\""}</_components.strong>{" in \"yo-yo\", but with first tone → steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"xiū"}</_components.strong>{" sounds like "}<_components.strong>{"\"shyo\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"first tone"}</_components.strong>{" (¯) is a "}<_components.strong>{"high and flat"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like singing a steady high note: "}<_components.strong>{"\"xiū¯\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"xiū"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"修 (xiū) - \"to repair; to fix; to study\""}</_components.li>{"\n"}<_components.li>{"修理 (xiū lǐ) - \"to repair\""}</_components.li>{"\n"}<_components.li>{"修改 (xiū gǎi) - \"to modify; to revise\""}</_components.li>{"\n"}<_components.li>{"装修 (zhuāng xiū) - \"to renovate\""}</_components.li>{"\n"}<_components.li>{"修习 (xiū xí) - \"to study; to practice\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
