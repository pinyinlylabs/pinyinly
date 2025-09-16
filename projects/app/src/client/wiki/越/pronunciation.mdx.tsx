// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 越 (yuè)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" yuè"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command: "}<_components.strong>{"\"Yway!\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"y"}</_components.strong>{" like "}<_components.strong>{"\"y\""}</_components.strong>{" in \"yes\""}</_components.li>{"\n"}<_components.li><_components.strong>{"uè"}</_components.strong>{" sounds like "}<_components.strong>{"\"way\""}</_components.strong>{" but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"yuè"}</_components.strong>{" sounds like "}<_components.strong>{"\"yway!\""}</_components.strong>{" with a decisive drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip (Fourth tone: ˋ)"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" starts "}<_components.strong>{"high"}</_components.strong>{" and drops "}<_components.strong>{"fast"}</_components.strong>{":"}</_components.p>{"\n"}<_components.p>{"Say it like you're emphasizing going beyond: "}<_components.strong>{"\"yuè!\""}</_components.strong>{" — that's the sharp falling tone of "}<_components.strong>{"yuè"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"越来越 (yuè lái yuè) - \"more and more\""}</_components.li>{"\n"}<_components.li>{"超越 (chāo yuè) - \"transcend; surpass\""}</_components.li>{"\n"}<_components.li>{"跨越 (kuà yuè) - \"cross over; span\""}</_components.li>{"\n"}<_components.li>{"越过 (yuè guò) - \"pass over; cross\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
