// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
import {CustomComponent, CustomWrapper, Separator} from "./helpers";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components);
  return <><Separator title="Body text" />{"\n"}<_components.p>{"Body text with "}<_components.strong>{"bold"}</_components.strong>{" and "}<_components.em>{"italic"}</_components.em>{" and "}<_components.code>{"inline code"}</_components.code>{" and "}<_components.mark className="pyly-mdx-mark pyly-mdx-mark-default">{"highlighted text"}</_components.mark>{"."}</_components.p>{"\n"}<Separator title="Headings" />{"\n"}<_components.h1>{"Heading 1"}</_components.h1>{"\n"}<_components.h2>{"Heading 2"}</_components.h2>{"\n"}<_components.h3>{"Heading 3"}</_components.h3>{"\n"}<_components.h4>{"Heading 4"}</_components.h4>{"\n"}<_components.h5>{"Heading 5"}</_components.h5>{"\n"}<_components.h6>{"Heading 6"}</_components.h6>{"\n"}<Separator title="Ordered list" />{"\n"}<_components.ol>{"\n"}<_components.li>{"First item"}</_components.li>{"\n"}<_components.li>{"Second item"}{"\n"}<_components.ol>{"\n"}<_components.li>{"Nested first"}</_components.li>{"\n"}<_components.li>{"Nested second"}{"\n"}<_components.ol>{"\n"}<_components.li>{"Nested third"}</_components.li>{"\n"}</_components.ol>{"\n"}</_components.li>{"\n"}</_components.ol>{"\n"}</_components.li>{"\n"}<_components.li>{"Third item"}</_components.li>{"\n"}</_components.ol>{"\n"}<Separator title="Unordered list" />{"\n"}<_components.ul>{"\n"}<_components.li>{"First item"}</_components.li>{"\n"}<_components.li>{"Second item"}{"\n"}<_components.ul>{"\n"}<_components.li>{"Nested first"}{"\n"}<_components.ul>{"\n"}<_components.li>{"Nested second"}</_components.li>{"\n"}</_components.ul>{"\n"}</_components.li>{"\n"}</_components.ul>{"\n"}</_components.li>{"\n"}<_components.li>{"Third item"}</_components.li>{"\n"}</_components.ul>{"\n"}<Separator title="Horizontal rule" />{"\n"}<_components.hr />{"\n"}<Separator title="Tables" />{"\n"}<_components.table><_components.thead><_components.tr><_components.th style={{
    textAlign: "left"
  }}>{"Left align"}</_components.th><_components.th style={{
    textAlign: "center"
  }}>{"Center"}</_components.th><_components.th style={{
    textAlign: "right"
  }}>{"Right align"}</_components.th><_components.th>{"Normal"}</_components.th></_components.tr></_components.thead><_components.tbody><_components.tr><_components.td style={{
    textAlign: "left"
  }}>{"Pinyin"}</_components.td><_components.td style={{
    textAlign: "center"
  }}>{"mù"}</_components.td><_components.td style={{
    textAlign: "right"
  }}>{"1"}</_components.td><_components.td>{"1"}</_components.td></_components.tr><_components.tr><_components.td style={{
    textAlign: "left"
  }}>{"Core meaning"}</_components.td><_components.td style={{
    textAlign: "center"
  }}>{"tree; wood; timber; wooden"}</_components.td><_components.td style={{
    textAlign: "right"
  }}>{"2"}</_components.td><_components.td>{"2"}</_components.td></_components.tr><_components.tr><_components.td style={{
    textAlign: "left"
  }}>{"Part of speech"}</_components.td><_components.td style={{
    textAlign: "center"
  }}>{"noun"}</_components.td><_components.td style={{
    textAlign: "right"
  }}>{"3"}</_components.td><_components.td>{"3"}</_components.td></_components.tr><_components.tr><_components.td style={{
    textAlign: "left"
  }}>{"Tone"}</_components.td><_components.td style={{
    textAlign: "center"
  }}>{"fourth tone"}</_components.td><_components.td style={{
    textAlign: "right"
  }}>{"4"}</_components.td><_components.td>{"4"}</_components.td></_components.tr></_components.tbody></_components.table>{"\n"}<Separator title="Custom leaf components" />{"\n"}<CustomComponent />{"\n"}<Separator title="Custom wrapper components" />{"\n"}<_components.p>{"Some "}<CustomWrapper>{"normal and "}<_components.strong>{"bold"}</_components.strong>{" content"}</CustomWrapper>{" wrapped in a custom component."}</_components.p></>;
}
export default function MDXContent(props: any = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
