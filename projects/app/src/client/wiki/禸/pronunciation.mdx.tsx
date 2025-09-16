// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 禸 (róu)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" róu"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"r"}</_components.strong>{" like "}<_components.strong>{"\"r\""}</_components.strong>{" in \"red\" (but softer, more like a light \"zh\" sound)"}</_components.li>{"\n"}<_components.li><_components.strong>{"óu"}</_components.strong>{" sounds like "}<_components.strong>{"\"oh\""}</_components.strong>{" but with second tone → rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"róu"}</_components.strong>{" sounds like "}<_components.strong>{"\"roe\""}</_components.strong>{" with a rising tone"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (´) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking: "}<_components.strong>{"\"róu?\""}</_components.strong>{" — that's the questioning rise of "}<_components.strong>{"róu"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"禸 (róu) - \"tracks; footprints\" (rarely used independently)"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Note on Usage:"}</_components.strong></_components.p>{"\n"}<_components.p>{"禸 is primarily used as a radical component in other characters and is rarely used as a standalone\ncharacter in modern Chinese. It represents the concept of tracks or animal footprints and appears in\ncharacters related to movement or traces."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
