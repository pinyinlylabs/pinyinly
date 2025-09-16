// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 何 (hé)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" hé"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"h"}</_components.strong>{" like "}<_components.strong>{"\"h\""}</_components.strong>{" in \"hat\""}</_components.li>{"\n"}<_components.li><_components.strong>{"é"}</_components.strong>{" sounds like "}<_components.strong>{"\"eh\""}</_components.strong>{" in \"bet\", but with second tone → rising up"}</_components.li>{"\n"}<_components.li><_components.strong>{"hé"}</_components.strong>{" sounds like "}<_components.strong>{"\"heh?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (´) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking a question: "}<_components.strong>{"\"hé?\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"hé"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"何 (hé) - \"what; which\""}</_components.li>{"\n"}<_components.li>{"如何 (rú hé) - \"how; in what way\""}</_components.li>{"\n"}<_components.li>{"为何 (wèi hé) - \"why; for what reason\""}</_components.li>{"\n"}<_components.li>{"何时 (hé shí) - \"when; what time\""}</_components.li>{"\n"}<_components.li>{"何处 (hé chù) - \"where; what place\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
