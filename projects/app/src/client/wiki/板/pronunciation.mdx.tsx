// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 板 (bǎn)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" bǎn"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"b"}</_components.strong>{" like "}<_components.strong>{"\"b\""}</_components.strong>{" in \"ban\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǎn"}</_components.strong>{" sounds like "}<_components.strong>{"\"ahn\""}</_components.strong>{", but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"bǎn"}</_components.strong>{" sounds like "}<_components.strong>{"\"bahn\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"板 (bǎn) - \"board; plank\""}</_components.li>{"\n"}<_components.li>{"黑板 (hēi bǎn) - \"blackboard\""}</_components.li>{"\n"}<_components.li>{"老板 (lǎo bǎn) - \"boss\""}</_components.li>{"\n"}<_components.li>{"键盘 (jiàn pǎn) - \"keyboard\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"A "}<_components.strong>{"board"}</_components.strong>{" bends slightly when pressed — that's the dip-then-rise third tone of "}<_components.strong>{"bǎn"}</_components.strong>{"!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
