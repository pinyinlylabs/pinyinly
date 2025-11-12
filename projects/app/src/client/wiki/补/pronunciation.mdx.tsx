// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 补 (bǔ)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" bǔ"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"b"}</_components.strong>{" like "}<_components.strong>{"\"b\""}</_components.strong>{" in \"book\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǔ"}</_components.strong>{" sounds like "}<_components.strong>{"\"oo\""}</_components.strong>{" in \"book\" but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"bǔ"}</_components.strong>{" sounds like "}<_components.strong>{"\"boo\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"补 (bǔ) - \"supplement; patch\""}</_components.li>{"\n"}<_components.li>{"补充 (bǔ chōng) - \"supplement; add\""}</_components.li>{"\n"}<_components.li>{"弥补 (mí bǔ) - \"make up for; remedy\""}</_components.li>{"\n"}<_components.li>{"补习 (bǔ xí) - \"tutorial; supplementary study\""}</_components.li>{"\n"}<_components.li>{"修补 (xiū bǔ) - \"repair; fix\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The third tone's dip-and-rise pattern is like patching a hole - you go down into the problem, then\nrise back up with the fix!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
