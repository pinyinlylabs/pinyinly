// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(Object.create(_provideComponents()), props.components), {Example, Examples, Hanzi, Translated} = _components;
  return <><_components.p>{"The character "}<_components.strong>{"全"}</_components.strong>{" means "}<_components.strong>{"\"nothing missing\""}</_components.strong>{" — it’s used when something is complete, everyone is\nincluded, or an action is done fully. You'll see it in everyday phrases like “whole family,” “all\ncame,” or “completely forgot.”"}</_components.p>{"\n"}<_components.p><_components.strong>{"全"}</_components.strong>{" expresses "}<_components.strong>{"completeness or totality"}</_components.strong>{"."}<_components.br />{"\n"}{"Same meaning, different sentence positions."}</_components.p>{"\n"}<Examples><_components.h3>{"🧠 How it’s used"}</_components.h3><_components.p>{"Whole things"}</_components.p><Example><Hanzi>{"全家"}</Hanzi><Translated>{"the whole family"}</Translated></Example><Example><Hanzi>{"全世界"}</Hanzi><Translated>{"the whole world"}</Translated></Example><_components.p>{"All people"}</_components.p><Example><Hanzi>{"我们全到了。"}</Hanzi><Translated>{"We all arrived"}</Translated></Example><Example><Hanzi>{"学生全没来。"}</Hanzi><Translated>{"None of the students came"}</Translated></Example><_components.p>{"Complete actions"}</_components.p><Example><Hanzi>{"我全忘了。"}</Hanzi><Translated>{"I totally forgot"}</Translated></Example><Example><Hanzi>{"他的话我全信了。"}</Hanzi><Translated>{"I believed everything he said"}</Translated></Example></Examples>{"\n"}<_components.hr />{"\n"}<_components.h3>{"⚠️ Watch out for: 全 vs 都"}</_components.h3>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"都"}</_components.strong>{" means “all” for plural subjects"}</_components.li>{"\n"}<_components.li><_components.strong>{"全"}</_components.strong>{" adds emphasis to "}<_components.strong>{"completeness"}</_components.strong></_components.li>{"\n"}</_components.ul>{"\n"}<_components.p>{"They’re often used together:"}<_components.br />{"\n"}{"→ 我们"}<_components.strong>{"全都"}</_components.strong>{"来了。("}<_components.em>{"We all came."}</_components.em>{")"}</_components.p>{"\n"}<_components.h3>{"🧠 Tip to remember"}</_components.h3>{"\n"}<_components.p>{"Imagine a whole cake with no slices missing — that’s "}<_components.strong>{"全"}</_components.strong>{"."}</_components.p>{"\n"}<_components.h2>{"Mnemonic"}</_components.h2>{"\n"}<_components.p>{"Imagine a ruler/king (王) gathering all his people (人) together. When everyone is united, you have\nthe whole or entire group."}</_components.p></>;
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
