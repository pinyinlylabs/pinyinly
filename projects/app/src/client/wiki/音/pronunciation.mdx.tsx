// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 音 (yīn)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" yīn"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: First tone"}</_components.strong>{" — "}<_components.strong>{"high and flat"}</_components.strong>{" tone, like a steady note"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"y"}</_components.strong>{" like "}<_components.strong>{"\"y\""}</_components.strong>{" in \"yes\""}</_components.li>{"\n"}<_components.li><_components.strong>{"īn"}</_components.strong>{" sounds like "}<_components.strong>{"\"een\""}</_components.strong>{" in \"seen\" but held steady and high"}</_components.li>{"\n"}<_components.li><_components.strong>{"yīn"}</_components.strong>{" sounds like "}<_components.strong>{"\"yin\""}</_components.strong>{" with a steady high pitch"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"first tone"}</_components.strong>{" (ˉ) is a "}<_components.strong>{"high and steady"}</_components.strong>{" tone. Say "}<_components.strong>{"\"yīn\""}</_components.strong>{" like you're holding a musical\nnote at a high, constant pitch — fitting for the word \"sound\"!"}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"音 (yīn) - \"sound\""}</_components.li>{"\n"}<_components.li>{"音乐 (yīn yuè) - \"music\""}</_components.li>{"\n"}<_components.li>{"音响 (yīn xiǎng) - \"sound system\""}</_components.li>{"\n"}<_components.li>{"录音 (lù yīn) - \"recording\""}</_components.li>{"\n"}<_components.li>{"发音 (fā yīn) - \"pronunciation\""}</_components.li>{"\n"}<_components.li>{"语音 (yǔ yīn) - \"speech sound\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"音 means \"sound\" — pronounce it with a high, steady tone like a pure musical note: "}<_components.strong>{"yīn"}</_components.strong>{"!"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
