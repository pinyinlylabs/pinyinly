import { createTransformer, transform } from "#mdx/metro-transformer.ts";
import { describe, expect, it } from "vitest";

function getJsxContent(src: string) {
  const match = /function _createMdxContent\((?:.+?)return (.*?);$/ms.exec(src);
  if (!match) {
    throw new Error(`Could not find MDXContent in source`);
  }
  return match[1]?.trim();
}

describe(transform, () => {
  it(`should transform basic MDX`, async () => {
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
      ""use client";
      /*@jsxRuntime automatic*/
      /*@jsxImportSource react*/
      import {useMDXComponents as _provideComponents} from "@bacons/mdx";
      function _createMdxContent(props) {
        const _components = {
          ..._provideComponents(),
          ...props.components
        };
        return <><_components.h1>{"Hello World"}</_components.h1>{"\\n"}<_components.blockquote>{"\\n"}<_components.p>{"Universe"}</_components.p>{"\\n"}</_components.blockquote>{"\\n"}<_components.ul>{"\\n"}<_components.li>{"a"}</_components.li>{"\\n"}<_components.li>{"b"}</_components.li>{"\\n"}</_components.ul>{"\\n"}<_components.p><_components.img src={require("./foo/bar.png")} alt="custom alt text" /></_components.p></>;
      }
      export default function MDXContent(props = {}) {
        const {wrapper: MDXLayout} = {
          ..._provideComponents(),
          ...props.components
        };
        return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
      }


      function _makeExpoMetroProvided(name, _components) {
        return function MDXExpoMetroComponent(props) {
          console.warn("Component " + name + " was not imported, exported, or provided by MDXProvider as global scope")
          return <_components.span {...props}/>;
        };
      }
      "
    `);
  });

  it(`should transform MDX with sibling and nested custom components`, async () => {
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
      ""use client";
      /*@jsxRuntime automatic*/
      /*@jsxImportSource react*/
      import {useMDXComponents as _provideComponents} from "@bacons/mdx";
      import Foo from './foo';
      function _createMdxContent(props) {
        const _components = {
          ..._provideComponents(),
          ...props.components
        };
        return <><_components.h1>{"Hello World"}</_components.h1>{"\\n"}{"\\n"}<Foo />{"\\n"}<Foo />{"\\n"}<Foo><Foo /></Foo></>;
      }
      export default function MDXContent(props = {}) {
        const {wrapper: MDXLayout} = {
          ..._provideComponents(),
          ...props.components
        };
        return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
      }


      function _makeExpoMetroProvided(name, _components) {
        return function MDXExpoMetroComponent(props) {
          console.warn("Component " + name + " was not imported, exported, or provided by MDXProvider as global scope")
          return <_components.span {...props}/>;
        };
      }
      "
    `);
  });

  it(`should transform MDX with custom components`, async () => {
    const result = await transform({
      filename: `test.mdx`,
      //   src: `- 123`,
      src: `
# Hello World

import Foo from './foo'

<Foo />`,
    });

    expect(result.src).toMatchInlineSnapshot(`
      ""use client";
      /*@jsxRuntime automatic*/
      /*@jsxImportSource react*/
      import {useMDXComponents as _provideComponents} from "@bacons/mdx";
      import Foo from './foo';
      function _createMdxContent(props) {
        const _components = {
          ..._provideComponents(),
          ...props.components
        };
        return <><_components.h1>{"Hello World"}</_components.h1>{"\\n"}{"\\n"}<Foo /></>;
      }
      export default function MDXContent(props = {}) {
        const {wrapper: MDXLayout} = {
          ..._provideComponents(),
          ...props.components
        };
        return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
      }


      function _makeExpoMetroProvided(name, _components) {
        return function MDXExpoMetroComponent(props) {
          console.warn("Component " + name + " was not imported, exported, or provided by MDXProvider as global scope")
          return <_components.span {...props}/>;
        };
      }
      "
    `);
  });

  it(`should transform MDX with custom components that were not imported`, async () => {
    const result = await transform({
      filename: `test.mdx`,
      //   src: `- 123`,
      src: `
# Hello World

<Foo />`,
    });

    expect(result.src).toMatchInlineSnapshot(`
      ""use client";
      /*@jsxRuntime automatic*/
      /*@jsxImportSource react*/
      import {useMDXComponents as _provideComponents} from "@bacons/mdx";
      function _createMdxContent(props) {
        const _components = {
          ..._provideComponents(),
          ...props.components
        }, {Foo} = _components;
        Foo ??= _makeExpoMetroProvided("Foo", _components);
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


      function _makeExpoMetroProvided(name, _components) {
        return function MDXExpoMetroComponent(props) {
          console.warn("Component " + name + " was not imported, exported, or provided by MDXProvider as global scope")
          return <_components.span {...props}/>;
        };
      }
      "
    `);
  });

  it(`should transform MDX with custom components wrapping markdown content`, async () => {
    const result = await transform({
      filename: `test.mdx`,
      //   src: `- 123`,
      src: `
# Hello World

<Foo>Some **bold** text</Foo>`,
    });

    expect(result.src).toMatchInlineSnapshot(`
      ""use client";
      /*@jsxRuntime automatic*/
      /*@jsxImportSource react*/
      import {useMDXComponents as _provideComponents} from "@bacons/mdx";
      function _createMdxContent(props) {
        const _components = {
          ..._provideComponents(),
          ...props.components
        }, {Foo} = _components;
        Foo ??= _makeExpoMetroProvided("Foo", _components);
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


      function _makeExpoMetroProvided(name, _components) {
        return function MDXExpoMetroComponent(props) {
          console.warn("Component " + name + " was not imported, exported, or provided by MDXProvider as global scope")
          return <_components.span {...props}/>;
        };
      }
      "
    `);
  });

  it(`should transform MDX images`, async () => {
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

  it(`transforms code blocks`, async () => {
    const { transform } = createTransformer();
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
});
