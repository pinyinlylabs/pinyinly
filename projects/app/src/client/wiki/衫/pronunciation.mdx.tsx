// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 衫 (shān)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" shān"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like holding a steady note: "}<_components.strong>{"\"Ahhhh\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"sh"}</_components.strong>{" like "}<_components.strong>{"\"sh\""}</_components.strong>{" in \"shirt\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ān"}</_components.strong>{" sounds like "}<_components.strong>{"\"ahn\""}</_components.strong>{" but held steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"shān"}</_components.strong>{" sounds like "}<_components.strong>{"\"shahn\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"衫 (shān) - \"shirt; unlined upper garment\""}</_components.li>{"\n"}<_components.li>{"衬衫 (chèn shān) - \"shirt; dress shirt\""}</_components.li>{"\n"}<_components.li>{"汗衫 (hàn shān) - \"undershirt; T-shirt\""}</_components.li>{"\n"}<_components.li>{"毛衫 (máo shān) - \"sweater\""}</_components.li>{"\n"}<_components.li>{"背心衫 (bèi xīn shān) - \"vest\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Remember \"shirt\" starts with \"sh\" just like 衫, and the steady first tone is like confidently saying\n\"This is my shirt!\" in a clear, steady voice."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
