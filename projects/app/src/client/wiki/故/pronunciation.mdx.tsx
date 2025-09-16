// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p><_components.strong>{"🗣️ Pronunciation of 故 (gù)"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Pinyin:"}</_components.strong>{" gù"}</_components.li>{"\n"}<_components.li><_components.strong>{"Tone: Fourth tone"}</_components.strong>{" — sharp "}<_components.strong>{"falling"}</_components.strong>{" tone, like giving a command"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🔤 Breakdown:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"g"}</_components.strong>{" like "}<_components.strong>{"\"g\""}</_components.strong>{" in \"go\""}</_components.li>{"\n"}<_components.li><_components.strong>{"ù"}</_components.strong>{" sounds like "}<_components.strong>{"\"oo\""}</_components.strong>{" in \"good\", but with a sharp falling tone"}</_components.li>{"\n"}<_components.li><_components.strong>{"gù"}</_components.strong>{" sounds like "}<_components.strong>{"\"goo!\""}</_components.strong>{" with a sharp drop"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"📝 Common Examples:"}</_components.strong></_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"故 (gù) - \"incident, reason\""}</_components.li>{"\n"}<_components.li>{"故事 (gù shi) - \"story\""}</_components.li>{"\n"}<_components.li>{"故乡 (gù xiāng) - \"hometown\""}</_components.li>{"\n"}<_components.li>{"故意 (gù yì) - \"on purpose\""}</_components.li>{"\n"}<_components.li>{"事故 (shì gù) - \"accident\""}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"💡 Memory Tip:"}</_components.strong></_components.p>{"\n"}<_components.p>{"The decisive fourth tone reflects the definitive nature of an "}<_components.strong>{"incident"}</_components.strong>{" or the firmness of\nsomething done on "}<_components.strong>{"purpose"}</_components.strong>{"."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
