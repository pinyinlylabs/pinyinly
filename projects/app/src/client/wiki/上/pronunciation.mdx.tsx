// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import { useMDXComponents as _provideComponents } from "@/client/hooks/useMDXComponents";
import __mdx_import_shang4_alloy_0 from "./shang4-alloy.m4a";
import __mdx_import_shang4_ash_1 from "./shang4-ash.m4a";
import __mdx_import_shang4_echo_2 from "./shang4-echo.m4a";
import __mdx_import_shang4_nova_3 from "./shang4-nova.m4a";
function _createMdxContent(props: any) {
  const _components = Object.assign(
      Object.create(_provideComponents()),
      props.components,
    ),
    { Speech } = _components;
  return (
    <>
      <_components.p>
        <_components.strong>
          {"🗣️ Pronunciation of 上 (shàng)"}
        </_components.strong>
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"Pinyin:"}</_components.strong>
          {" shàng"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Tone: Fourth tone"}</_components.strong>
          {" — sharp "}
          <_components.strong>{"falling"}</_components.strong>
          {" tone, like giving a command: "}
          <_components.strong>{"“Down!”"}</_components.strong>
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <Speech
        srcs={[
          __mdx_import_shang4_alloy_0,
          __mdx_import_shang4_ash_1,
          __mdx_import_shang4_echo_2,
          __mdx_import_shang4_nova_3,
        ]}
      />
      {"\n"}
      <_components.p>
        <_components.strong>{"🔤 Breakdown:"}</_components.strong>
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"sh"}</_components.strong>
          {" like "}
          <_components.strong>{"“sh”"}</_components.strong>
          {" in “shush”"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"ang"}</_components.strong>
          {" like "}
          <_components.strong>{"“ahng”"}</_components.strong>
          {" in “song” (but more nasal and farther back)"}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"shàng"}</_components.strong>
          {" sounds like "}
          <_components.strong>{"“shahng!”"}</_components.strong>
          {" with a falling tone"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {
          "⚠️ Don’t round the “a” like in “shank” — keep it open and farther back in your throat."
        }
      </_components.p>
      {"\n"}
      <_components.p>
        <_components.strong>{"🎧 Tone tip:"}</_components.strong>
      </_components.p>
      {"\n"}
      <_components.p>
        {"The "}
        <_components.strong>{"fourth tone"}</_components.strong>
        {" (ˋ) starts "}
        <_components.strong>{"high"}</_components.strong>
        {" and drops "}
        <_components.strong>{"fast"}</_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.p>
        {"Say it like you’re annoyed or shouting "}
        <_components.strong>{"“Hey!”"}</_components.strong>
        {" — that’s the energy of "}
        <_components.strong>{"shàng"}</_components.strong>
        {"."}
      </_components.p>
    </>
  );
}
export default function MDXContent(props: any = {}) {
  const { wrapper: MDXLayout } = {
    ..._provideComponents(),
    ...props.components,
  };
  return MDXLayout ? (
    <MDXLayout {...props}>
      <_createMdxContent {...props} />
    </MDXLayout>
  ) : (
    _createMdxContent(props)
  );
}
function _missingMdxReference(id, component) {
  throw new Error(
    "Expected " +
      (component ? "component" : "object") +
      " `" +
      id +
      "` to be defined: you likely forgot to import, pass, or provide it.",
  );
}
