// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 革 (gé)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" gé"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"g"}</_components.strong>{" like "}<_components.strong>{"\"g\""}</_components.strong>{" in \"go\""}</_components.li>{"\n"}<_components.li><_components.strong>{"é"}</_components.strong>{" sounds like "}<_components.strong>{"\"eh\""}</_components.strong>{" but with second tone → rising up"}</_components.li>{"\n"}<_components.li><_components.strong>{"gé"}</_components.strong>{" sounds like "}<_components.strong>{"\"geh?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"革 (gé) - \"leather; hide\""}</_components.li>{"\n"}<_components.li>{"改革 (gǎi gé) - \"reform; revolution\""}</_components.li>{"\n"}<_components.li>{"革命 (gé mìng) - \"revolution\""}</_components.li>{"\n"}<_components.li>{"皮革 (pí gé) - \"leather; hide\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"rising tone"}</_components.strong>{" sounds like questioning the quality of leather: \"Is this good leather?\" — "}<_components.strong>{"gé"}</_components.strong></_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
