// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 印 (yìn)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" yìn"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"y"}</_components.strong>{" like "}<_components.strong>{"\"y\""}</_components.strong>{" in \"yes\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ìn"}</_components.strong>{" sounds like "}<_components.strong>{"\"een\""}</_components.strong>{" but with fourth tone → sharp drop down"}</_components.li>{"\n"}<_components.li><_components.strong>{"yìn"}</_components.strong>{" sounds like "}<_components.strong>{"\"yeen!\""}</_components.strong>{" with a sharp falling tone"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (`) is a sharp "}<_components.strong>{"falling"}</_components.strong>{" tone: Start high and drop sharply down, like stamping\nfirmly: "}<_components.strong>{"\"yìn!\""}</_components.strong></_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"印 (yìn) - \"print; seal; stamp\""}</_components.li>{"\n"}<_components.li>{"印象 (yìn xiàng) - \"impression\""}</_components.li>{"\n"}<_components.li>{"打印 (dǎ yìn) - \"print\""}</_components.li>{"\n"}<_components.li>{"复印 (fù yìn) - \"photocopy\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"印 means \"print\" — when you "}<_components.strong>{"stamp"}</_components.strong>{" something, you press down with a sharp, decisive motion, like\nthe falling tone!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
