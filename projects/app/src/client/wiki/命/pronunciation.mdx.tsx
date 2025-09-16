// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 命 (mìng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" mìng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command: "}<_components.strong>{"\"Ming!\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"m"}</_components.strong>{" like "}<_components.strong>{"\"m\""}</_components.strong>{" in \"man\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ìng"}</_components.strong>{" sounds like "}<_components.strong>{"\"eeng\""}</_components.strong>{" in \"seeing\", but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"mìng"}</_components.strong>{" sounds like "}<_components.strong>{"\"meeng!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (ˋ) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're being decisive or giving a command: "}<_components.strong>{"\"mìng!\""}</_components.strong>{" — let your voice drop sharply."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"命 (mìng) - \"life; fate; destiny\""}</_components.li>{"\n"}<_components.li>{"生命 (shēng mìng) - \"life\""}</_components.li>{"\n"}<_components.li>{"命运 (mìng yùn) - \"fate; destiny\""}</_components.li>{"\n"}<_components.li>{"救命 (jiù mìng) - \"save a life; help!\""}</_components.li>{"\n"}<_components.li>{"性命 (xìng mìng) - \"life\""}</_components.li>{"\n"}<_components.li>{"要命 (yào mìng) - \"terrible; awful\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
