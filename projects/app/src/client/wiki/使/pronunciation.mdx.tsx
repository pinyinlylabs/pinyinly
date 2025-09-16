// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 使 (shǐ)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" shǐ"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Third tone"}</_components.strong>{" — "}<_components.strong>{"falling-rising"}</_components.strong>{" tone, like saying \"uh-huh\" when nodding"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"sh"}</_components.strong>{" like "}<_components.strong>{"\"sh\""}</_components.strong>{" in \"shoe\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ǐ"}</_components.strong>{" sounds like "}<_components.strong>{"\"ih\""}</_components.strong>{" in \"ship\", but with third tone → dip down and rise up"}</_components.li>{"\n"}<_components.li><_components.strong>{"shǐ"}</_components.strong>{" sounds like "}<_components.strong>{"\"shih\""}</_components.strong>{" with a dip-then-rise"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🎧 Tone tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The "}<_components.strong>{"third tone"}</_components.strong>{" (ˇ) is a "}<_components.strong>{"fall–then-rise"}</_components.strong>{" tone:"}</_components.p>{"\n"}<_components.p>{"Say it like you're thinking or being thoughtful: "}<_components.strong>{"\"shǐ...\""}</_components.strong>{" — that's the tone pattern of "}<_components.strong>{"shǐ"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"使 (shǐ) - \"to make; to cause; to use\""}</_components.li>{"\n"}<_components.li>{"使用 (shǐ yòng) - \"to use; to employ\""}</_components.li>{"\n"}<_components.li>{"使得 (shǐ dé) - \"to make; to cause\""}</_components.li>{"\n"}<_components.li>{"大使 (dà shǐ) - \"ambassador\""}</_components.li>{"\n"}<_components.li>{"大使馆 (dà shǐ guǎn) - \"embassy\""}</_components.li>{"\n"}</_components.ul></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
