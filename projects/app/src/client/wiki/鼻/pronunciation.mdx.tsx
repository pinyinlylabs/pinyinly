// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 鼻 (bí)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" bí"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"b"}</_components.strong>{" like "}<_components.strong>{"\"b\""}</_components.strong>{" in \"bee\""}</_components.li>{"\n"}<_components.li><_components.strong>{"í"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee\""}</_components.strong>{" in \"see\", but with second tone → rising up"}</_components.li>{"\n"}<_components.li><_components.strong>{"bí"}</_components.strong>{" sounds like "}<_components.strong>{"\"bee?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (´) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Start low and go up, like asking a question: "}<_components.strong>{"\"bí?\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"bí"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"鼻 (bí) - \"nose\""}</_components.li>{"\n"}<_components.li>{"鼻子 (bí zi) - \"nose\""}</_components.li>{"\n"}<_components.li>{"鼻音 (bí yīn) - \"nasal sound\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Imagine pointing to your nose and asking "}<_components.strong>{"\"bí?\""}</_components.strong>{" with that rising intonation — like you're\nconfirming it's your nose!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
