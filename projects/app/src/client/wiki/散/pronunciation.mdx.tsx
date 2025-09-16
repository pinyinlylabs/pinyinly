// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 散 (sàn)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" sàn"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"s"}</_components.strong>{" like "}<_components.strong>{"\"s\""}</_components.strong>{" in \"see\""}</_components.li>{"\n"}<_components.li><_components.strong>{"àn"}</_components.strong>{" sounds like "}<_components.strong>{"\"ahn\""}</_components.strong>{", but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"sàn"}</_components.strong>{" sounds like "}<_components.strong>{"\"sahn!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"散 (sàn) - \"scatter, disperse\""}</_components.li>{"\n"}<_components.li>{"散步 (sàn bù) - \"take a walk\""}</_components.li>{"\n"}<_components.li>{"散开 (sàn kāi) - \"spread out\""}</_components.li>{"\n"}<_components.li>{"解散 (jiě sàn) - \"dissolve, disband\""}</_components.li>{"\n"}<_components.li>{"分散 (fēn sàn) - \"disperse\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Special Note:"}</_components.strong></_components.p>{"\n"}<_components.p>{"散 has another pronunciation "}<_components.strong>{"sǎn"}</_components.strong>{" (third tone) meaning \"loose\" or \"casual\", but for\n\"scatter/disperse\", it's "}<_components.strong>{"sàn"}</_components.strong>{" (fourth tone)."}</_components.p>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The sharp falling tone mimics things "}<_components.strong>{"scattering"}</_components.strong>{" or spreading out quickly and decisively."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
