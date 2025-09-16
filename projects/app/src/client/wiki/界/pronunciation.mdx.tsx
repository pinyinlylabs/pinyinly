// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 界 (jiè)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" jiè"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command: "}<_components.strong>{"\"Stop!\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"j"}</_components.strong>{" like "}<_components.strong>{"\"j\""}</_components.strong>{" in \"jeep\" (but softer)"}</_components.li>{"\n"}<_components.li><_components.strong>{"iè"}</_components.strong>{" sounds like "}<_components.strong>{"\"yeh\""}</_components.strong>{" in \"yeah\", but with fourth tone → sharp falling"}</_components.li>{"\n"}<_components.li><_components.strong>{"jiè"}</_components.strong>{" sounds like "}<_components.strong>{"\"jyeh!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"界 (jiè) - \"boundary; world; field\""}</_components.li>{"\n"}<_components.li>{"世界 (shì jiè) - \"world\""}</_components.li>{"\n"}<_components.li>{"边界 (biān jiè) - \"border; boundary\""}</_components.li>{"\n"}<_components.li>{"界限 (jiè xiàn) - \"boundary; limit\""}</_components.li>{"\n"}<_components.li>{"学界 (xué jiè) - \"academic circles\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Fourth tone is like firmly setting a "}<_components.strong>{"boundary"}</_components.strong>{" - your voice "}<_components.strong>{"drops sharply"}</_components.strong>{" throughout "}<_components.strong>{"jiè"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
