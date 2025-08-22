/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <_components.p><_components.strong>{"面"}</_components.strong>{" is a versatile and visual character that shows up all over Chinese — from faces to directions\nto delicious bowls of noodles. It originally referred to a "}<_components.strong>{"flat surface"}</_components.strong>{" or "}<_components.strong>{"the front of\nsomething"}</_components.strong>{", and that idea still carries through in all its meanings. Learning 面 is like opening a\ndoor to a whole 面 (side!) of the language that’s everywhere once you notice it."}</_components.p>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
