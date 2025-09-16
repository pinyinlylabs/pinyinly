// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 楚 (chǔ)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" chǔ"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"ch"}</_components.strong>{" like "}<_components.strong>{"\"ch\""}</_components.strong>{" in \"church\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǔ"}</_components.strong>{" sounds like "}<_components.strong>{"\"oo\""}</_components.strong>{" in \"book\" but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"chǔ"}</_components.strong>{" sounds like "}<_components.strong>{"\"choo\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" (ˇ) is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're thinking clearly: "}<_components.strong>{"\"chǔ...\""}</_components.strong>{" — that thoughtful, understanding tone."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"楚 (chǔ) - \"clear\""}</_components.li>{"\n"}<_components.li>{"清楚 (qīng chǔ) - \"clear/obvious\""}</_components.li>{"\n"}<_components.li>{"楚楚 (chǔ chǔ) - \"neat/tidy\""}</_components.li>{"\n"}<_components.li>{"痛楚 (tòng chǔ) - \"pain/suffering\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of "}<_components.strong>{"chǔ"}</_components.strong>{" as clarity dawning on you — the dip-and-rise tone is like confusion clearing up!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
