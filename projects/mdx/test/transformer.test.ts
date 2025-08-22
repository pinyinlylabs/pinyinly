import { createTransformer, transform } from "#transformer.ts";
import { describe, expect, test } from "vitest";

function getJsxContent(src: string) {
  const match = /function _createMdxContent\((?:.+?)return (.*?);$/ms.exec(src);
  if (!match) {
    throw new Error(`Could not find MDXContent in source`);
  }
  return match[1]?.trim();
}

describe(`transform` satisfies HasNameOf<typeof transform>, () => {
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

    expect(result.src.includes(`import __mdx_import_foo_bar_0 from "./foo/bar.png"`)).toEqual(true);
    expect(result.src.includes(`src={__mdx_import_foo_bar_0}`)).toEqual(true);
    expect(result.src).toMatchInlineSnapshot(`
      "/*@jsxRuntime automatic*/
      /*@jsxImportSource react*/
      import {useMDXComponents as _provideComponents} from "@/client/hooks/useMDXComponents";
      import __mdx_import_foo_bar_0 from "./foo/bar.png";
      function _createMdxContent(props) {
        const _components = Object.assign(Object.create(_provideComponents()), props.components);
        return <><_components.h1>{"Hello World"}</_components.h1>{"\\n"}<_components.blockquote>{"\\n"}<_components.p>{"Universe"}</_components.p>{"\\n"}</_components.blockquote>{"\\n"}<_components.ul>{"\\n"}<_components.li>{"a"}</_components.li>{"\\n"}<_components.li>{"b"}</_components.li>{"\\n"}</_components.ul>{"\\n"}<_components.p><_components.img src={__mdx_import_foo_bar_0} alt="custom alt text" /></_components.p></>;
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
      `"<_components.p><_components.img src={__mdx_import_foo_bar_0} alt="alt text" /></_components.p>"`,
    );
    expect(result.src.includes(`import __mdx_import_foo_bar_0 from "./foo/bar.png"`)).toEqual(true);
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

    expect(result.src).toContain(`import __mdx_import_image_0 from "./image.jpg"`);
    expect(result.src).toContain(`src={__mdx_import_image_0}`);
    expect(result.src).toContain(`source={__mdx_import_image_0}`);
    expect(result.src).toContain(`src="https://external.com/image.jpg"`);

    expect(getJsxContent(result.src)).toMatchInlineSnapshot(
      `"<><_components.h1>{"Hello World"}</_components.h1>{"\\n"}<MyComponent src={__mdx_import_image_0} />{"\\n"}<MyComponent imageSrc={__mdx_import_image_0} />{"\\n"}<MyComponent source={__mdx_import_image_0} />{"\\n"}<SomeOtherElement src="https://external.com/image.jpg" /></>"`,
    );
  });

  test(`should hoist require() calls to top-level imports for Vitest compatibility`, async () => {
    const result = await transform({
      filename: `test.mdx`,
      src: `
# Test

![image1](./assets/image1.png)
![image2](./assets/image2.jpg)
![image1 again](./assets/image1.png)

<MyComponent src="./assets/video.mp4" />`,
    });

    // Should have imports at the top level
    expect(result.src).toContain(`import __mdx_import_assets_image1_0 from "./assets/image1.png"`);
    expect(result.src).toContain(`import __mdx_import_assets_image2_1 from "./assets/image2.jpg"`);
    expect(result.src).toContain(`import __mdx_import_assets_video_2 from "./assets/video.mp4"`);

    // Should not contain require() calls
    expect(result.src).not.toContain(`require(`);

    // Should use the same import variable for the same module path
    const image1Matches = result.src.match(/__mdx_import_assets_image1_0/g);
    expect(image1Matches).toHaveLength(3); // Once in import, twice in usage

    // Check that imports are at the top of the module
    const lines = result.src.split(`\n`).filter((line: string) => line.trim());
    const importLines = lines.filter((line: string) => line.startsWith(`import`));
    const firstNonImportIndex = lines.findIndex((line: string) => !line.startsWith(`import`) && !line.startsWith(`/*`));
    const lastImportLine = importLines.at(-1);
    const lastImportIndex = lastImportLine ? lines.lastIndexOf(lastImportLine) : -1;
    
    // All imports should come before other code
    expect(lastImportIndex).toBeLessThan(firstNonImportIndex);
  });

  test(`should work with createTransformer and custom options`, async () => {
    const customTransform = createTransformer({
      matchLocalAsset: (url: string) => url.startsWith(`./custom/`),
    });

    const result = await customTransform({
      filename: `test.mdx`,
      src: `
![should not transform](./foo/bar.png)
![should transform](./custom/baz.jpg)`,
    });

    // Only the custom path should be transformed to import
    expect(result.src).toContain(`import __mdx_import_custom_baz_0 from "./custom/baz.jpg"`);
    expect(result.src).toContain(`src={__mdx_import_custom_baz_0}`);
    expect(result.src).toContain(`src="./foo/bar.png"`); // should remain as string
    expect(result.src).not.toContain(`require(`);
  });
});
