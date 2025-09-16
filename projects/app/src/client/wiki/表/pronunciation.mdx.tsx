// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 表 (biǎo)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" biǎo"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"b"}</_components.strong>{" like "}<_components.strong>{"\"b\""}</_components.strong>{" in \"book\""}</_components.li>{"\n"}<_components.li><_components.strong>{"i"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee\""}</_components.strong>{" in \"see\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǎo"}</_components.strong>{" sounds like "}<_components.strong>{"\"ow\""}</_components.strong>{" in \"cow\" but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"biǎo"}</_components.strong>{" sounds like "}<_components.strong>{"\"bee-ow\""}</_components.strong>{" with a dip-then-rise on the \"ow\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"表 (biǎo) - \"express; show\""}</_components.li>{"\n"}<_components.li>{"表示 (biǎo shì) - \"indicate; express\""}</_components.li>{"\n"}<_components.li>{"表达 (biǎo dá) - \"express; convey\""}</_components.li>{"\n"}<_components.li>{"表现 (biǎo xiàn) - \"performance; show\""}</_components.li>{"\n"}<_components.li>{"手表 (shǒu biǎo) - \"wristwatch\""}</_components.li>{"\n"}<_components.li>{"表格 (biǎo gé) - \"table; form\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"When you \"express\" something, your voice naturally dips and rises with emotion - just like the third\ntone of 表!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
