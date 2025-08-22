/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.blockquote>{"\n"}<_components.p><_components.strong>{"“A flag planted on the ground, pointing upward — rising up, beginning something new.”"}</_components.strong></_components.p>{"\n"}</_components.blockquote>{"\n"}<_components.p><_components.strong>{"🧱 Character breakdown:"}</_components.strong></_components.p>{"\n"}<_components.p><_components.strong>{"上"}</_components.strong>{" has a "}<_components.strong>{"horizontal line"}</_components.strong>{" (the ground) and a "}<_components.strong>{"short stroke above it"}</_components.strong>{", like a flag or marker\ngoing up."}</_components.p>{"\n"}<_components.p>{"Visually, it "}<_components.strong>{"points upward"}</_components.strong>{", matching the meanings:"}</_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"Up"}</_components.strong>{" (direction)"}</_components.li>{"\n"}<_components.li><_components.strong>{"Above"}</_components.strong>{" (position)"}</_components.li>{"\n"}<_components.li><_components.strong>{"Start"}</_components.strong>{" (as in start work or get on)"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p><_components.strong>{"🗯️ How to remember it:"}</_components.strong></_components.p>{"\n"}<_components.p>{"“Imagine you’re starting a race — you plant a flag in the ground and step up to the starting line.\nThat’s the beginning — that’s 上.”"}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
