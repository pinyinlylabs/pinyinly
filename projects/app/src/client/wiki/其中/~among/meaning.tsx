/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components), {Example, Examples, Hanzi, Translated} = _components;
  return <><_components.p><_components.strong>{"其中"}</_components.strong>{" is a compound word made up of:"}</_components.p>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"其"}</_components.strong>{" → “its” / “their” / “that”"}</_components.li>{"\n"}<_components.li><_components.strong>{"中"}</_components.strong>{" → “middle” / “within”"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.p>{"Together, "}<_components.strong>{"其中"}</_components.strong>{" literally means "}<_components.strong>{"“within it”"}</_components.strong>{" or "}<_components.strong>{"“among them”"}</_components.strong>{" — and it’s used to refer to\n"}<_components.strong>{"something inside a group or set"}</_components.strong>{" that has already been mentioned or is understood from context."}</_components.p>{"\n"}<Examples><_components.h3>{"🔍 Common uses:"}</_components.h3><_components.p>{"Referring to a "}<_components.strong>{"subset"}</_components.strong>{" of something:"}</_components.p><Example><Hanzi>{"我们班有30个学生，"}<_components.strong>{"其中"}</_components.strong>{"10个是女生。"}</Hanzi><Translated>{"There are 30 students in our class, "}<_components.strong>{"10 of whom"}</_components.strong>{" are girls."}</Translated></Example><_components.p>{"Referring to a "}<_components.strong>{"part of a process or structure"}</_components.strong>{":"}</_components.p><Example><Hanzi>{"我喜欢这本书，"}<_components.strong>{"其中"}</_components.strong>{"第六章最有意思。"}</Hanzi><Translated>{"I like this book, and "}<_components.strong>{"Chapter 6 is the most interesting part"}</_components.strong>{"."}</Translated></Example><_components.p>{"Referring to a "}<_components.strong>{"particular item from a group"}</_components.strong>{":"}</_components.p><Example><Hanzi>{"他们提出了很多建议，"}<_components.strong>{"其中"}</_components.strong>{"一个非常有帮助。"}</Hanzi><Translated>{"They made many suggestions, and "}<_components.strong>{"one of them"}</_components.strong>{" was very helpful."}</Translated></Example></Examples>{"\n"}<_components.h3>{"💡 Tip to remember:"}</_components.h3>{"\n"}<_components.p>{"Think of "}<_components.strong>{"其中"}</_components.strong>{" as a pointer into the "}<_components.strong>{"middle of a group"}</_components.strong>{"."}<_components.br />{"\n"}{"You're zooming in on "}<_components.strong>{"something inside a set"}</_components.strong>{" — “among them” or “within it.”"}</_components.p></>;
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
