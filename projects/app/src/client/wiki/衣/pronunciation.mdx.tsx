// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 衣 (yī)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" yī"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like holding a steady note: "}<_components.strong>{"\"Eeee\""}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"y"}</_components.strong>{" like "}<_components.strong>{"\"y\""}</_components.strong>{" in \"yes\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ī"}</_components.strong>{" sounds like "}<_components.strong>{"\"ee\""}</_components.strong>{" in \"see\" but held steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"yī"}</_components.strong>{" sounds like "}<_components.strong>{"\"yee\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"衣 (yī) - \"clothes\""}</_components.li>{"\n"}<_components.li>{"衣服 (yī fu) - \"clothing\""}</_components.li>{"\n"}<_components.li>{"上衣 (shàng yī) - \"upper garment\""}</_components.li>{"\n"}<_components.li>{"大衣 (dà yī) - \"overcoat\""}</_components.li>{"\n"}<_components.li>{"洗衣机 (xǐ yī jī) - \"washing machine\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"Think of the steady, high tone like the sound you make when showing off a nice piece of clothing:\n\"Eeeee, look at this!\""}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
