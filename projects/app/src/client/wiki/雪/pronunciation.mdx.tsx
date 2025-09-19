// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 雪 (xuě)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" xuě"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"x"}</_components.strong>{" like "}<_components.strong>{"\"sh\""}</_components.strong>{" in \"she\" (Chinese x is similar to \"sh\")"}</_components.li>{"\n"}<_components.li><_components.strong>{"uě"}</_components.strong>{" sounds like "}<_components.strong>{"\"way\""}</_components.strong>{" but softer, with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"xuě"}</_components.strong>{" sounds like "}<_components.strong>{"\"shway\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"雪 (xuě) - \"snow\""}</_components.li>{"\n"}<_components.li>{"下雪 (xià xuě) - \"to snow\" (literally \"fall snow\")"}</_components.li>{"\n"}<_components.li>{"雪花 (xuě huā) - \"snowflake\""}</_components.li>{"\n"}<_components.li>{"雪人 (xuě rén) - \"snowman\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" mimics the gentle up-and-down drift of falling snow — "}<_components.strong>{"xuě"}</_components.strong></_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
