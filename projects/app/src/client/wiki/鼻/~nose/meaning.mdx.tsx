// @ts-nocheck
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import { useMDXComponents as _provideComponents } from "@/client/hooks/useMDXComponents";
function _createMdxContent(props: any) {
  const _components = Object.assign(
    Object.create(_provideComponents()),
    props.components,
  );
  return (
    <>
      <_components.p>
        {
          "The part projecting above the mouth on the face of a person or animal; nose."
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Quick Reference"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "| Aspect         | Info                 |\n| -------------- | -------------------- |\n| Pinyin         | bí                   |\n| Core meaning   | nose; nasal          |\n| Part of speech | noun                 |\n| Tone           | second tone (rising) |"
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Visual Breakdown"}</_components.h2>
      {"\n"}
      <_components.p>
        {"鼻 depicts the nose as the central, prominent feature of the face."}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          "| Component | Meaning                                                |\n| --------- | ------------------------------------------------------ |\n| "
        }
        <_components.strong>{"自"}</_components.strong>
        {"    | Self, from - originally a pictograph of a nose         |\n| "}
        <_components.strong>{"田"}</_components.strong>
        {"    | Field - represents the nostrils as field-like openings |\n| "}
        <_components.strong>{"丌"}</_components.strong>
        {"    | Table/platform - the bridge of the nose                |"}
      </_components.p>
      {"\n"}
      <_components.p>
        {
          'The character emphasizes the nose as the central point of reference for "self" (自).'
        }
      </_components.p>
      {"\n"}
      <_components.h2>{"Mnemonic"}</_components.h2>
      {"\n"}
      <_components.p>
        {"Think of 鼻 as "}
        <_components.strong>
          {'"the central feature that defines your face"'}
        </_components.strong>
        {":"}
      </_components.p>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          {"自 (self) represents the nose as the central point of identity"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"田 (field) represents the nostril openings like small fields"}
        </_components.li>
        {"\n"}
        <_components.li>
          {
            "The combination shows the nose as your most prominent facial feature"
          }
        </_components.li>
        {"\n"}
        <_components.li>
          {"Picture touching your nose when pointing to yourself"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"Like the nose being the first thing people notice about your face"}
        </_components.li>
        {"\n"}
        <_components.li>
          {"The central prominence that sticks out from your face"}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.p>
        {"This creates the image: "}
        <_components.strong>
          {"the prominent central feature that identifies your face"}
        </_components.strong>
        {"."}
      </_components.p>
      {"\n"}
      <_components.h2>{"Core Meaning & Usage"}</_components.h2>
      {"\n"}
      <_components.p>
        {"鼻 represents "}
        <_components.strong>
          {"the nose and everything related to nasal functions"}
        </_components.strong>
        {". It's used:"}
      </_components.p>
      {"\n"}
      <_components.ol>
        {"\n"}
        <_components.li>
          <_components.strong>{"Body part"}</_components.strong>
          {': 鼻子 (bízi) - "nose"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Nasal features"}</_components.strong>
          {': 鼻孔 (bíkǒng) - "nostril"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Smell function"}</_components.strong>
          {': 鼻炎 (bíyán) - "rhinitis; nasal inflammation"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"Descriptive"}</_components.strong>
          {': 鼻音 (bíyīn) - "nasal sound"'}
        </_components.li>
        {"\n"}
      </_components.ol>
      {"\n"}
      <_components.h2>{"Examples"}</_components.h2>
      {"\n"}
      <_components.ul>
        {"\n"}
        <_components.li>
          <_components.strong>{"鼻子"}</_components.strong>
          {' (bízi) - "nose"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"鼻孔"}</_components.strong>
          {' (bíkǒng) - "nostril"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"鼻梁"}</_components.strong>
          {' (bíliáng) - "bridge of the nose"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"鼻炎"}</_components.strong>
          {' (bíyán) - "rhinitis; nasal inflammation"'}
        </_components.li>
        {"\n"}
        <_components.li>
          <_components.strong>{"鼻音"}</_components.strong>
          {' (bíyīn) - "nasal sound"'}
        </_components.li>
        {"\n"}
      </_components.ul>
      {"\n"}
      <_components.h2>{"Cultural Context"}</_components.h2>
      {"\n"}
      <_components.p>
        {
          "In Chinese culture, the nose (鼻) is considered an important facial feature for beauty and character\nassessment. A well-shaped 鼻梁 (nose bridge) is traditionally considered attractive. The nose is\nalso important in traditional Chinese medicine, as nasal breathing and health are connected to\noverall well-being and qi circulation."
        }
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
