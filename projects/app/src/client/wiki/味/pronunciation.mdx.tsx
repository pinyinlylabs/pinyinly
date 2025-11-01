// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 味 (wèi)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" wèi"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command: "}<_components.strong>{"\"Way!\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"w"}</_components.strong>{" like "}<_components.strong>{"\"w\""}</_components.strong>{" in \"way\""}</_components.li>{"\n"}<_components.li><_components.strong>{"èi"}</_components.strong>{" sounds like "}<_components.strong>{"\"ay\""}</_components.strong>{" in \"way\", but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"wèi"}</_components.strong>{" sounds like "}<_components.strong>{"\"way!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (ˋ) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're being decisive: "}<_components.strong>{"\"wèi!\""}</_components.strong>{" — let your voice drop sharply."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"味 (wèi) - \"taste; flavor\""}</_components.li>{"\n"}<_components.li>{"味道 (wèi dào) - \"taste; flavor\""}</_components.li>{"\n"}<_components.li>{"口味 (kǒu wèi) - \"taste preference\""}</_components.li>{"\n"}<_components.li>{"调味 (tiáo wèi) - \"season; flavor\""}</_components.li>{"\n"}<_components.li>{"香味 (xiāng wèi) - \"fragrance; aroma\""}</_components.li>{"\n"}<_components.li>{"甜味 (tián wèi) - \"sweet taste\""}</_components.li>{"\n"}<_components.li>{"酸味 (suān wèi) - \"sour taste\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
