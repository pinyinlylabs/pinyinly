// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 蛋 (dàn)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" dàn"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"d"}</_components.strong>{" like "}<_components.strong>{"\"d\""}</_components.strong>{" in \"dog\""}</_components.li>{"\n"}<_components.li><_components.strong>{"àn"}</_components.strong>{" sounds like "}<_components.strong>{"\"ahn\""}</_components.strong>{", but with fourth tone → sharp falling pitch"}</_components.li>{"\n"}<_components.li><_components.strong>{"dàn"}</_components.strong>{" sounds like "}<_components.strong>{"\"dahn!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (`) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're stating something definitively: "}<_components.strong>{"\"dàn!\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"dàn"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"蛋 (dàn) - \"egg\""}</_components.li>{"\n"}<_components.li>{"鸡蛋 (jī dàn) - \"chicken egg\""}</_components.li>{"\n"}<_components.li>{"蛋糕 (dàn gāo) - \"cake\""}</_components.li>{"\n"}<_components.li>{"煮蛋 (zhǔ dàn) - \"boiled egg\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of "}<_components.strong>{"dàn"}</_components.strong>{" as confidently identifying an egg: \"That's an egg!\" — the falling tone sounds\ndecisive and clear."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
