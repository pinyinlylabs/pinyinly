// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 条 (tiáo)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" tiáo"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"t"}</_components.strong>{" like "}<_components.strong>{"\"t\""}</_components.strong>{" in \"top\""}</_components.li>{"\n"}<_components.li><_components.strong>{"iáo"}</_components.strong>{" sounds like "}<_components.strong>{"\"yow\""}</_components.strong>{" (as in \"wow\"), but with second tone → rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"tiáo"}</_components.strong>{" sounds like "}<_components.strong>{"\"tyow?\""}</_components.strong>{" with a rising tone"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"条 (tiáo) - \"strip; measure word for long thin things\""}</_components.li>{"\n"}<_components.li>{"一条路 (yī tiáo lù) - \"one road\""}</_components.li>{"\n"}<_components.li>{"条件 (tiáo jiàn) - \"condition; requirement\""}</_components.li>{"\n"}<_components.li>{"面条儿 (miàn tiáor) - \"noodles\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"A "}<_components.strong>{"strip"}</_components.strong>{" or "}<_components.strong>{"road"}</_components.strong>{" stretches upward like the rising second tone of "}<_components.strong>{"tiáo"}</_components.strong>{"!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
