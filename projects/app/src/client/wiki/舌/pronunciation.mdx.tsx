// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 舌 (shé)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" shé"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question with interest"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"sh"}</_components.strong>{" like "}<_components.strong>{"\"sh\""}</_components.strong>{" in \"sheep\""}</_components.li>{"\n"}<_components.li><_components.strong>{"é"}</_components.strong>{" sounds like "}<_components.strong>{"\"eh\""}</_components.strong>{" in \"meh\", but with second tone → rises up"}</_components.li>{"\n"}<_components.li><_components.strong>{"shé"}</_components.strong>{" sounds like "}<_components.strong>{"\"sheh\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (ˊ) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Start low and rise smoothly, like saying "}<_components.strong>{"\"What?\""}</_components.strong>{" with curiosity: "}<_components.strong>{"\"shé?\""}</_components.strong>{" — that's the rising\npattern."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"舌 (shé) - \"tongue\""}</_components.li>{"\n"}<_components.li>{"舌头 (shé tou) - \"tongue\""}</_components.li>{"\n"}<_components.li>{"口舌 (kǒu shé) - \"argument; dispute\""}</_components.li>{"\n"}<_components.li>{"母舌 (mǔ shé) - \"mother tongue\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Anatomical Note:"}</_components.strong></_components.p>{"\n"}<_components.p>{"舌 (shé) literally means \"tongue\" and is used in both anatomical contexts and metaphorically in\nexpressions about speech and language."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
