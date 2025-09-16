// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 亥 (hài)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" hài"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"h"}</_components.strong>{" like "}<_components.strong>{"\"h\""}</_components.strong>{" in \"hat\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ài"}</_components.strong>{" sounds like "}<_components.strong>{"\"eye\""}</_components.strong>{", but with fourth tone → sharp fall"}</_components.li>{"\n"}<_components.li><_components.strong>{"hài"}</_components.strong>{" sounds like "}<_components.strong>{"\"high!\""}</_components.strong>{" with a commanding drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"亥 (hài) - \"12th terrestrial branch\" (in Chinese zodiac/calendar)"}</_components.li>{"\n"}<_components.li>{"亥时 (hài shí) - \"9-11 PM\" (traditional time period)"}</_components.li>{"\n"}<_components.li>{"亥年 (hài nián) - \"year of the pig\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"亥 represents the "}<_components.strong>{"pig"}</_components.strong>{" in the Chinese zodiac - imagine someone sharply calling "}<_components.strong>{"\"high!\""}</_components.strong>{" (hài)\nto get a pig's attention!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
