// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 画 (huà)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" huà"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command: "}<_components.strong>{"\"Stop!\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"h"}</_components.strong>{" like "}<_components.strong>{"\"h\""}</_components.strong>{" in \"hat\""}</_components.li>{"\n"}<_components.li><_components.strong>{"uà"}</_components.strong>{" sounds like "}<_components.strong>{"\"wa\""}</_components.strong>{" in \"water\", but with fourth tone → sharp falling"}</_components.li>{"\n"}<_components.li><_components.strong>{"huà"}</_components.strong>{" sounds like "}<_components.strong>{"\"hwah!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"画 (huà) - \"to draw; painting\""}</_components.li>{"\n"}<_components.li>{"画家 (huà jiā) - \"painter; artist\""}</_components.li>{"\n"}<_components.li>{"画画 (huà huà) - \"to draw pictures\""}</_components.li>{"\n"}<_components.li>{"图画 (tú huà) - \"picture; drawing\""}</_components.li>{"\n"}<_components.li>{"画面 (huà miàn) - \"picture; scene\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Fourth tone is like the sharp stroke of a "}<_components.strong>{"brush"}</_components.strong>{" - your voice "}<_components.strong>{"drops sharply"}</_components.strong>{" throughout\n"}<_components.strong>{"huà"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
