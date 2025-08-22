/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p>{"The sky; heavens; the firmament above."}</_components.p>{"\n"}<_components.h2>{"Quick Reference"}</_components.h2>{"\n"}<_components.p>{"| Aspect         | Info                   |\n| -------------- | ---------------------- |\n| Pinyin         | tiān                   |\n| Core meaning   | sky; heaven; day       |\n| Part of speech | noun                   |\n| Tone           | first tone (high flat) |"}</_components.p>{"\n"}<_components.h2>{"Visual Breakdown"}</_components.h2>{"\n"}<_components.p>{"天 represents "}<_components.strong>{"a person under the vast sky"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p>{"| Component | Visual Description                                   |\n| --------- | ---------------------------------------------------- |\n| "}<_components.strong>{"一"}</_components.strong>{"    | A horizontal line representing the sky/heavens above |\n| "}<_components.strong>{"大"}</_components.strong>{"    | A person (大) standing below, arms outstretched      |"}</_components.p>{"\n"}<_components.h2>{"Mnemonic"}</_components.h2>{"\n"}<_components.p>{"Think of 天 as "}<_components.strong>{"a person standing under the infinite sky"}</_components.strong>{":"}</_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"The horizontal line (一) at the top represents the vast expanse of sky"}</_components.li>{"\n"}<_components.li>{"The character 大 below shows a person with arms stretched wide"}</_components.li>{"\n"}<_components.li>{"Like someone standing in an open field, looking up at the endless sky"}</_components.li>{"\n"}<_components.li>{"The person appears small beneath the immensity of heaven"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p>{"This captures the ancient Chinese concept of humans as part of the cosmic order, standing beneath\nthe dome of heaven."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
