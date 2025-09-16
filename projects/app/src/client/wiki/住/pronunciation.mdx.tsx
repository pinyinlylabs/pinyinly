// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 住 (zhù)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" zhù"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"zh"}</_components.strong>{" like "}<_components.strong>{"\"j\""}</_components.strong>{" in \"judge\" (but with tongue curled back)"}</_components.li>{"\n"}<_components.li><_components.strong>{"ù"}</_components.strong>{" sounds like "}<_components.strong>{"\"oo\""}</_components.strong>{" in \"book\", but with fourth tone → sharp downward drop"}</_components.li>{"\n"}<_components.li><_components.strong>{"zhù"}</_components.strong>{" sounds like "}<_components.strong>{"\"joo\""}</_components.strong>{" with a sharp falling tone"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (ˋ) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like deciding where to settle: "}<_components.strong>{"\"zhù!\""}</_components.strong>{" — that sharp drop down shows the fourth tone\npattern."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"住 (zhù) - \"live; reside\""}</_components.li>{"\n"}<_components.li>{"住房 (zhù fáng) - \"housing\""}</_components.li>{"\n"}<_components.li>{"住院 (zhù yuàn) - \"be hospitalized\""}</_components.li>{"\n"}<_components.li>{"居住 (jū zhù) - \"reside; dwell\""}</_components.li>{"\n"}<_components.li>{"住址 (zhù zhǐ) - \"address\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of "}<_components.strong>{"\"joo\""}</_components.strong>{" with a firm falling tone — like making a decisive choice about where to live!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
