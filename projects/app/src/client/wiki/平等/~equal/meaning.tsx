/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components), {Example, Examples, Hanzi, Translated} = _components;
  return <><_components.p>{"The Chinese word 平等 (píngděng) means “equality” or “equal” in English."}</_components.p>{"\n"}<_components.p>{"Breakdown of the characters:"}</_components.p>{"\n"}<_components.ul>{"\n"}<_components.li>{"平 (píng) – flat, level, even, peaceful"}</_components.li>{"\n"}<_components.li>{"等 (děng) – rank, class, kind; equal; to wait"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p>{"When combined, 平等 expresses the idea of equality or being equal, especially in terms of rights,\nstatus, or treatment."}</_components.p>{"\n"}<Examples><_components.p>{"Examples in sentences:"}</_components.p><Example><Hanzi>{"我们主张人人平等。"}</Hanzi><Translated>{"We advocate that everyone is equal."}</Translated></Example><Example><Hanzi>{"性别平等非常重要。"}</Hanzi><Translated>{"Gender equality is very important."}</Translated></Example><Example><Hanzi>{"在法律面前，人人平等。"}</Hanzi><Translated>{"Everyone is equal before the law."}</Translated></Example></Examples></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
