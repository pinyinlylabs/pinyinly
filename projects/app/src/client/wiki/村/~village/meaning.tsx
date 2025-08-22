/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><_components.p>{"A small rural settlement; countryside community; village."}</_components.p>{"\n"}<_components.h2>{"Quick Reference"}</_components.h2>{"\n"}<_components.p>{"| Aspect         | Info                      |\n| -------------- | ------------------------- |\n| Pinyin         | cūn                       |\n| Core meaning   | village; rural settlement |\n| Part of speech | noun                      |\n| Tone           | first tone (high flat)    |"}</_components.p>{"\n"}<_components.h2>{"Visual Breakdown"}</_components.h2>{"\n"}<_components.p>{"村 combines "}<_components.strong>{"wood + inch"}</_components.strong>{" suggesting measured forest clearings."}</_components.p>{"\n"}<_components.p>{"| Component | Visual Description                                            |\n| --------- | ------------------------------------------------------------- |\n| "}<_components.strong>{"木"}</_components.strong>{"    | Tree/wood (木) - indicates forested area                      |\n| "}<_components.strong>{"寸"}</_components.strong>{"    | Inch/measure (寸) - suggests careful measurement and planning |"}</_components.p>{"\n"}<_components.h2>{"Mnemonic"}</_components.h2>{"\n"}<_components.p>{"Think of 村 as "}<_components.strong>{"measured clearings in the forest for villages"}</_components.strong>{":"}</_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"The wood radical (木) shows this is related to forested areas"}</_components.li>{"\n"}<_components.li>{"The measure component (寸) suggests carefully planned spaces"}</_components.li>{"\n"}<_components.li>{"Like surveying and measuring forest land to create village settlements"}</_components.li>{"\n"}<_components.li>{"Villages were often built by clearing measured portions of woodland"}</_components.li>{"\n"}<_components.li>{"The combination shows organized human habitation within natural settings"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p>{"This reflects how traditional Chinese villages were established by thoughtfully clearing forest\nareas and planning agricultural settlements in harmony with the natural environment."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
