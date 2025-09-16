// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 借 (jiè)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" jiè"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"j"}</_components.strong>{" like "}<_components.strong>{"\"j\""}</_components.strong>{" in \"jeep\", but with the tongue closer to the hard palate and no puff of air"}</_components.li>{"\n"}<_components.li><_components.strong>{"iè"}</_components.strong>{" sounds like "}<_components.strong>{"\"yeh\""}</_components.strong>{" but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"jiè"}</_components.strong>{" sounds like "}<_components.strong>{"\"jyeh!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (`) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're giving a firm command: "}<_components.strong>{"\"jiè!\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"jiè"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"借 (jiè) - \"borrow\""}</_components.li>{"\n"}<_components.li>{"借用 (jiè yòng) - \"borrow for use\""}</_components.li>{"\n"}<_components.li>{"借钱 (jiè qián) - \"borrow money\""}</_components.li>{"\n"}<_components.li>{"借书 (jiè shū) - \"borrow books\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
