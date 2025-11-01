// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 某 (mǒu)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" mǒu"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"m"}</_components.strong>{" like "}<_components.strong>{"\"m\""}</_components.strong>{" in \"more\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǒu"}</_components.strong>{" sounds like "}<_components.strong>{"\"oh\""}</_components.strong>{", but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"mǒu"}</_components.strong>{" sounds like "}<_components.strong>{"\"moh\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"某 (mǒu) - \"certain; some\""}</_components.li>{"\n"}<_components.li>{"某人 (mǒu rén) - \"someone; a certain person\""}</_components.li>{"\n"}<_components.li>{"某个 (mǒu gè) - \"some; certain\""}</_components.li>{"\n"}<_components.li>{"某天 (mǒu tiān) - \"one day; some day\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"When we say \"a "}<_components.strong>{"certain"}</_components.strong>{" someone,\" we're being thoughtful and uncertain — that's the hesitant\ndip-then-rise third tone of "}<_components.strong>{"mǒu"}</_components.strong>{"!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
