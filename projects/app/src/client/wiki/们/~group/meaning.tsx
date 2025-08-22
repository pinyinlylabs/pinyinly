/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p>{"A plural suffix for people; used to indicate a group of people."}</_components.p>{"\n"}<_components.h2>{"Quick Reference"}</_components.h2>{"\n"}<_components.p>{"| Aspect         | Info                     |\n| -------------- | ------------------------ |\n| Pinyin         | men (neutral tone)       |\n| Core meaning   | plural suffix for people |\n| Part of speech | particle/suffix          |\n| Tone           | neutral/light tone       |"}</_components.p>{"\n"}<_components.h2>{"Visual Breakdown"}</_components.h2>{"\n"}<_components.p>{"们 combines "}<_components.strong>{"person + gate"}</_components.strong>{" to show people gathering."}</_components.p>{"\n"}<_components.p>{"| Component | Visual Description                                     |\n| --------- | ------------------------------------------------------ |\n| "}<_components.strong>{"亻"}</_components.strong>{"    | Person radical (人) - indicates this relates to people |\n| "}<_components.strong>{"门"}</_components.strong>{"    | Gate (门) - suggests gathering, entrance, or group     |"}</_components.p>{"\n"}<_components.h2>{"Mnemonic"}</_components.h2>{"\n"}<_components.p>{"Think of 们 as "}<_components.strong>{"people gathering at a gate"}</_components.strong>{":"}</_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"The person radical (亻) shows this is about people"}</_components.li>{"\n"}<_components.li>{"The gate (门) represents a meeting place where people come together"}</_components.li>{"\n"}<_components.li>{"Like people gathering at the village gate or entrance to a building"}</_components.li>{"\n"}<_components.li>{"When you see multiple people at one gate, you know it's a group"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p>{"This suffix transforms singular person words into plural groups: 我 (I) → 我们 (we), 你 (you)\n→ 你们 (you all), 他 (he) → 他们 (they)."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
