// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 累 (lèi)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" lèi"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"l"}</_components.strong>{" like "}<_components.strong>{"\"l\""}</_components.strong>{" in \"low\""}</_components.li>{"\n"}<_components.li><_components.strong>{"èi"}</_components.strong>{" sounds like "}<_components.strong>{"\"ay\""}</_components.strong>{" in \"way\", but with fourth tone → sharp drop"}</_components.li>{"\n"}<_components.li><_components.strong>{"lèi"}</_components.strong>{" sounds like "}<_components.strong>{"\"lay!\""}</_components.strong>{" with a sharp fall"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (ˋ) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're exhausted and sighing: "}<_components.strong>{"\"lèi!\""}</_components.strong>{" — that's the sharp falling pattern of "}<_components.strong>{"lèi"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"累 (lèi) - \"tired\""}</_components.li>{"\n"}<_components.li>{"疲累 (pí lèi) - \"exhausted\""}</_components.li>{"\n"}<_components.li>{"劳累 (láo lèi) - \"weary\""}</_components.li>{"\n"}<_components.li>{"累了 (lèi le) - \"tired\" (completed action)"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"When you're "}<_components.strong>{"tired"}</_components.strong>{", your energy "}<_components.strong>{"drops"}</_components.strong>{" sharply — just like the fourth tone's falling pattern!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
