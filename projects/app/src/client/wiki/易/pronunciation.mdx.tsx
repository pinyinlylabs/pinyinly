// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 易 (yì)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" yì"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"y"}</_components.strong>{" like "}<_components.strong>{"\"y\""}</_components.strong>{" in \"yes\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ì"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee\""}</_components.strong>{" in \"see\" but with fourth tone → sharp falling"}</_components.li>{"\n"}<_components.li><_components.strong>{"yì"}</_components.strong>{" sounds like "}<_components.strong>{"\"yee!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (`) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like stating something is simple: "}<_components.strong>{"\"yì!\""}</_components.strong>{" — that sharp drop is the fourth tone pattern."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"易 (yì) - \"easy; simple\""}</_components.li>{"\n"}<_components.li>{"容易 (róng yì) - \"easy\""}</_components.li>{"\n"}<_components.li>{"简易 (jiǎn yì) - \"simple; easy\""}</_components.li>{"\n"}<_components.li>{"交易 (jiāo yì) - \"transaction; trade\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
