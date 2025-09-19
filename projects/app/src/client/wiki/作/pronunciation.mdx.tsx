// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 作 (zuò)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" zuò"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"z"}</_components.strong>{" like "}<_components.strong>{"\"ds\""}</_components.strong>{" in \"beds\" (but lighter)"}</_components.li>{"\n"}<_components.li><_components.strong>{"uò"}</_components.strong>{" sounds like "}<_components.strong>{"\"woh\""}</_components.strong>{", but with fourth tone → sharp falling"}</_components.li>{"\n"}<_components.li><_components.strong>{"zuò"}</_components.strong>{" sounds like "}<_components.strong>{"\"dzwoh!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (`) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like giving a firm command: "}<_components.strong>{"\"zuò!\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"zuò"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"作 (zuò) - \"to do; to make; to work\""}</_components.li>{"\n"}<_components.li>{"工作 (gōng zuò) - \"work; job\""}</_components.li>{"\n"}<_components.li>{"作业 (zuò yè) - \"homework; assignment\""}</_components.li>{"\n"}<_components.li>{"作家 (zuò jiā) - \"writer; author\""}</_components.li>{"\n"}<_components.li>{"作用 (zuò yòng) - \"function; effect; role\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
