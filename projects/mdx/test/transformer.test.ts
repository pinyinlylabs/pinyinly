import { createTransformer, transform } from "#transformer.ts";
import { describe, expect, test } from "vitest";

function getJsxContent(src: string) {
  const match = /function _createMdxContent\((?:.+?)return (.*?);$/ms.exec(src);
  if (!match) {
    throw new Error(`Could not find MDXContent in source`);
  }
  return match[1]?.trim();
}

describe(transform, () => {
  test(`should transform basic MDX`, async () => {
    const result = await transform({
      filename: `test.mdx`,
      //   src: `- 123`,
      src: `
# Hello World

> Universe

- a
- b

![custom alt text](./foo/bar.png)`,
    });

    expect(result.src.includes(`require("./foo/bar.png")`)).toEqual(true);
    expect(result.src).toMatchInlineSnapshot(`
      "/*@jsxRuntime automatic*/
      /*@jsxImportSource react*/
      import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
      function _createMdxContent(props) {
        const _components = Object.assign(Object.create(_provideComponents()), props.components);
        return <><_components.h1>{"Hello World"}</_components.h1>{"\\n"}<_components.blockquote>{"\\n"}<_components.p>{"Universe"}</_components.p>{"\\n"}</_components.blockquote>{"\\n"}<_components.ul>{"\\n"}<_components.li>{"a"}</_components.li>{"\\n"}<_components.li>{"b"}</_components.li>{"\\n"}</_components.ul>{"\\n"}<_components.p><_components.img src={require("./foo/bar.png")} alt="custom alt text" /></_components.p></>;
      }
      export default function MDXContent(props = {}) {
        const {wrapper: MDXLayout} = {
          ..._provideComponents(),
          ...props.components
        };
        return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
      }
      "
    `);
  });

  test(`should transform MDX with sibling and nested custom components`, async () => {
    const result = await transform({
      filename: `test.mdx`,
      //   src: `- 123`,
      src: `
# Hello World

import Foo from './foo'

<Foo />
<Foo />

<Foo>
  <Foo />
</Foo>`,
    });

    expect(result.src).toMatchInlineSnapshot(`
      "/*@jsxRuntime automatic*/
      /*@jsxImportSource react*/
      import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
      import Foo from './foo';
      function _createMdxContent(props) {
        const _components = Object.assign(Object.create(_provideComponents()), props.components);
        return <><_components.h1>{"Hello World"}</_components.h1>{"\\n"}{"\\n"}<Foo />{"\\n"}<Foo />{"\\n"}<Foo><Foo /></Foo></>;
      }
      export default function MDXContent(props = {}) {
        const {wrapper: MDXLayout} = {
          ..._provideComponents(),
          ...props.components
        };
        return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
      }
      "
    `);
  });

  test(`should transform MDX with custom components`, async () => {
    const result = await transform({
      filename: `test.mdx`,
      //   src: `- 123`,
      src: `
# Hello World

import Foo from './foo'

<Foo />`,
    });

    expect(result.src).toMatchInlineSnapshot(`
      "/*@jsxRuntime automatic*/
      /*@jsxImportSource react*/
      import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
      import Foo from './foo';
      function _createMdxContent(props) {
        const _components = Object.assign(Object.create(_provideComponents()), props.components);
        return <><_components.h1>{"Hello World"}</_components.h1>{"\\n"}{"\\n"}<Foo /></>;
      }
      export default function MDXContent(props = {}) {
        const {wrapper: MDXLayout} = {
          ..._provideComponents(),
          ...props.components
        };
        return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
      }
      "
    `);
  });

  test(`should transform MDX with custom components that were not imported`, async () => {
    const result = await transform({
      filename: `test.mdx`,
      //   src: `- 123`,
      src: `
# Hello World

<Foo />`,
    });

    expect(result.src).toMatchInlineSnapshot(`
      "/*@jsxRuntime automatic*/
      /*@jsxImportSource react*/
      import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
      function _createMdxContent(props) {
        const _components = Object.assign(Object.create(_provideComponents()), props.components), {Foo} = _components;
        return <><_components.h1>{"Hello World"}</_components.h1>{"\\n"}<Foo /></>;
      }
      export default function MDXContent(props = {}) {
        const {wrapper: MDXLayout} = {
          ..._provideComponents(),
          ...props.components
        };
        return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
      }
      function _missingMdxReference(id, component) {
        throw new Error("Expected " + (component ? "component" : "object") + " \`" + id + "\` to be defined: you likely forgot to import, pass, or provide it.");
      }
      "
    `);
  });

  test(`should transform MDX with custom components wrapping markdown content`, async () => {
    const result = await transform({
      filename: `test.mdx`,
      //   src: `- 123`,
      src: `
# Hello World

<Foo>Some **bold** text</Foo>`,
    });

    expect(result.src).toMatchInlineSnapshot(`
      "/*@jsxRuntime automatic*/
      /*@jsxImportSource react*/
      import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
      function _createMdxContent(props) {
        const _components = Object.assign(Object.create(_provideComponents()), props.components), {Foo} = _components;
        return <><_components.h1>{"Hello World"}</_components.h1>{"\\n"}<Foo>{"Some "}<_components.strong>{"bold"}</_components.strong>{" text"}</Foo></>;
      }
      export default function MDXContent(props = {}) {
        const {wrapper: MDXLayout} = {
          ..._provideComponents(),
          ...props.components
        };
        return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
      }
      function _missingMdxReference(id, component) {
        throw new Error("Expected " + (component ? "component" : "object") + " \`" + id + "\` to be defined: you likely forgot to import, pass, or provide it.");
      }
      "
    `);
  });

  test(`should transform MDX images`, async () => {
    const result = await transform({
      filename: `test.mdx`,
      //   src: `- 123`,
      src: `![alt text](./foo/bar.png)`,
    });

    expect(getJsxContent(result.src)).toMatchInlineSnapshot(
      `"<_components.p><_components.img src={require("./foo/bar.png")} alt="alt text" /></_components.p>"`,
    );
    expect(result.src.includes(`require("./foo/bar.png")`)).toEqual(true);
  });

  test(`transforms code blocks`, async () => {
    const transform = createTransformer();
    const result = await transform({
      filename: `test.mdx`,
      src: `
\`\`\`js
console.log("hello")
\`\`\`
`,
    });

    expect(getJsxContent(result.src)).toMatchInlineSnapshot(
      `"<_components.pre><_components.code className="language-js">{"console.log(\\"hello\\")\\n"}</_components.code></_components.pre>"`,
    );
  });

  test(`should transform arbitrary JSX elements with src attributes`, async () => {
    const result = await transform({
      filename: `test.mdx`,
      src: `
# Hello World

<MyComponent src="./image.jpg" />
<MyComponent imageSrc="./image.jpg" />
<MyComponent source="./image.jpg" />
<SomeOtherElement src="https://external.com/image.jpg" />`,
    });

    expect(result.src).toContain(`src={require("./image.jpg")}`);
    expect(result.src).toContain(`source={require("./image.jpg")}`);
    expect(result.src).toContain(`src="https://external.com/image.jpg"`);

    expect(getJsxContent(result.src)).toMatchInlineSnapshot(
      `"<><_components.h1>{"Hello World"}</_components.h1>{"\\n"}<MyComponent src={require("./image.jpg")} />{"\\n"}<MyComponent imageSrc={require("./image.jpg")} />{"\\n"}<MyComponent source={require("./image.jpg")} />{"\\n"}<SomeOtherElement src="https://external.com/image.jpg" /></>"`,
    );
  });
});