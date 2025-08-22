// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p>{"A period of time from sunrise to sunset; a 24-hour period; daytime."}</_components.p>{"\n"}<_components.h2>{"Quick Reference"}</_components.h2>{"\n"}<_components.p>{"| Aspect         | Info                   |\n| -------------- | ---------------------- |\n| Pinyin         | tiān                   |\n| Core meaning   | day; 24-hour period    |\n| Part of speech | noun                   |\n| Tone           | first tone (high flat) |"}</_components.p>{"\n"}<_components.h2>{"Visual Breakdown"}</_components.h2>{"\n"}<_components.p>{"天 represents "}<_components.strong>{"a person under the sky during the day"}</_components.strong>{"."}</_components.p>{"\n"}<_components.p>{"| Component | Visual Description                           |\n| --------- | -------------------------------------------- |\n| "}<_components.strong>{"一"}</_components.strong>{"    | The horizon line separating earth from sky   |\n| "}<_components.strong>{"大"}</_components.strong>{"    | A person (大) standing during daylight hours |"}</_components.p>{"\n"}<_components.h2>{"Mnemonic"}</_components.h2>{"\n"}<_components.p>{"Think of 天 as "}<_components.strong>{"measuring time by the sky's cycle"}</_components.strong>{":"}</_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"The horizontal line (一) represents the boundary between earth and sky"}</_components.li>{"\n"}<_components.li>{"The person (大) below experiences the passage of time under this sky"}</_components.li>{"\n"}<_components.li>{"During the day, we can see the sun crossing this sky boundary"}</_components.li>{"\n"}<_components.li>{"The full cycle of light and darkness creates one \"天\" (day)"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p>{"The character connects the cosmic rhythm of day and night with human experience, showing how we\nmeasure time by observing the sky above us."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
