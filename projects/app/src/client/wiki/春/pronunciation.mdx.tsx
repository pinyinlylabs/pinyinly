// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 春 (chūn)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" chūn"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"ch"}</_components.strong>{" like "}<_components.strong>{"\"ch\""}</_components.strong>{" in \"chair\" (but with tongue curled back)"}</_components.li>{"\n"}<_components.li><_components.strong>{"ūn"}</_components.strong>{" sounds like "}<_components.strong>{"\"oon\""}</_components.strong>{" in \"spoon\" but held steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"chūn"}</_components.strong>{" sounds like "}<_components.strong>{"\"choon\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎯 Mastering the \"ch\" sound:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"ch"}</_components.strong>{" in Chinese is different from English \"ch\":"}</_components.p>{"\n"}<_components.ol>{"\n"}<_components.li><_components.strong>{"Curl your tongue back"}</_components.strong>{" — tip pointing toward the roof of your mouth"}</_components.li>{"\n"}<_components.li><_components.strong>{"More breath"}</_components.strong>{" — make it aspirated (you should feel air on your hand)"}</_components.li>{"\n"}<_components.li><_components.strong>{"It's closer to \"chr\""}</_components.strong>{" than plain \"ch\""}</_components.li>{"\n"}</_components.ol>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"春 (chūn) - \"spring\""}</_components.li>{"\n"}<_components.li>{"春天 (chūn tiān) - \"spring; springtime\""}</_components.li>{"\n"}<_components.li>{"春节 (chūn jié) - \"Spring Festival; Chinese New Year\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
