// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 员 (yuán)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" yuán"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"y"}</_components.strong>{" like "}<_components.strong>{"\"y\""}</_components.strong>{" in \"yes\""}</_components.li>{"\n"}<_components.li><_components.strong>{"uán"}</_components.strong>{" sounds like "}<_components.strong>{"\"wan\""}</_components.strong>{" but with a rising tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"yuán"}</_components.strong>{" sounds like "}<_components.strong>{"\"ywan?\""}</_components.strong>{" with a questioning rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"second tone"}</_components.strong>{" (ˊ) is a "}<_components.strong>{"rising"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're asking a question: "}<_components.strong>{"\"yuán?\""}</_components.strong>{" — let your voice rise at the end."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"员 (yuán) - \"member; staff\""}</_components.li>{"\n"}<_components.li>{"员工 (yuán gōng) - \"employee; staff\""}</_components.li>{"\n"}<_components.li>{"会员 (huì yuán) - \"member\""}</_components.li>{"\n"}<_components.li>{"服务员 (fú wù yuán) - \"waiter; service staff\""}</_components.li>{"\n"}<_components.li>{"公务员 (gōng wù yuán) - \"civil servant\""}</_components.li>{"\n"}<_components.li>{"演员 (yǎn yuán) - \"actor; performer\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
