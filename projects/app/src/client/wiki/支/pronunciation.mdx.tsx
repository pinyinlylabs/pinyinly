// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 支 (zhī)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" zhī"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"zh"}</_components.strong>{" like "}<_components.strong>{"\"j\""}</_components.strong>{" in \"judge\" (but with tongue curled back)"}</_components.li>{"\n"}<_components.li><_components.strong>{"ī"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee\""}</_components.strong>{" in \"see\", but held steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"zhī"}</_components.strong>{" sounds like "}<_components.strong>{"\"jee\""}</_components.strong>{" with a steady high pitch and retroflex \"zh\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"first tone"}</_components.strong>{" (ˉ) is a "}<_components.strong>{"high and flat"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like singing a steady high note: "}<_components.strong>{"\"zhī~~~\""}</_components.strong>{" — that's the flat, steady tone of "}<_components.strong>{"zhī"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"支 (zhī) - \"branch; support\""}</_components.li>{"\n"}<_components.li>{"支持 (zhī chí) - \"support\""}</_components.li>{"\n"}<_components.li>{"支付 (zhī fù) - \"pay\""}</_components.li>{"\n"}<_components.li>{"一支笔 (yì zhī bǐ) - \"a pen\" (measure word)"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of "}<_components.strong>{"\"支\""}</_components.strong>{" as "}<_components.strong>{"\"jee\""}</_components.strong>{" held steady — like a steady branch supporting something!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
