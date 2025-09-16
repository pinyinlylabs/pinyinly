// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 极 (jí)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" jí"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Second tone"}</_components.strong>{" — "}<_components.strong>{"rising"}</_components.strong>{" tone, like asking a question"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"j"}</_components.strong>{" like "}<_components.strong>{"\"j\""}</_components.strong>{" in \"jeep\" (but softer, like \"gee\")"}</_components.li>{"\n"}<_components.li><_components.strong>{"í"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee\""}</_components.strong>{" in \"see\", but with second tone → rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"jí"}</_components.strong>{" sounds like "}<_components.strong>{"\"jee?\""}</_components.strong>{" with a rising tone"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"极 (jí) - \"extreme; very\""}</_components.li>{"\n"}<_components.li>{"极了 (jí le) - \"extremely; very much\""}</_components.li>{"\n"}<_components.li>{"积极 (jī jí) - \"active; positive\""}</_components.li>{"\n"}<_components.li>{"太极 (tài jí) - \"Tai Chi\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Something "}<_components.strong>{"extreme"}</_components.strong>{" reaches higher and higher — that's the rising second tone of "}<_components.strong>{"jí"}</_components.strong>{"!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
