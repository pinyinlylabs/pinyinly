// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 像 (xiàng)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" xiàng"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"x"}</_components.strong>{" like a soft "}<_components.strong>{"\"sh\""}</_components.strong>{" sound, but your tongue is much closer to your teeth"}</_components.li>{"\n"}<_components.li><_components.strong>{"iàng"}</_components.strong>{" sounds like "}<_components.strong>{"\"yahng\""}</_components.strong>{" but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"xiàng"}</_components.strong>{" sounds like "}<_components.strong>{"\"shyahng!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"fourth tone"}</_components.strong>{" (`) is a "}<_components.strong>{"sharp falling"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're giving a firm command: "}<_components.strong>{"\"xiàng!\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"xiàng"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"像 (xiàng) - \"resemble\""}</_components.li>{"\n"}<_components.li>{"好像 (hǎo xiàng) - \"seem like\""}</_components.li>{"\n"}<_components.li>{"像样 (xiàng yàng) - \"proper\""}</_components.li>{"\n"}<_components.li>{"肖像 (xiào xiàng) - \"portrait\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
