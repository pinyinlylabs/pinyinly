import { useMDXComponents } from "@/client/ui/hooks/useMDXComponents";
import type { WikiMdastRoot } from "@/client/query";
import type { ComponentType, ReactNode } from "react";
import { Fragment, createElement } from "react";

interface MdastNode {
  type: string;
  value?: string;
  depth?: number;
  ordered?: boolean;
  url?: string;
  title?: string;
  name?: string | null;
  attributes?: unknown[];
  children?: unknown[];
}

interface MdastAttribute {
  type: string;
  name?: string;
  value?: unknown;
}

interface RenderContext {
  inTableHeader: boolean;
}

const defaultContext: RenderContext = {
  inTableHeader: false,
};

export function MdastContent({ root }: { root: WikiMdastRoot }) {
  const components = useMDXComponents();

  return renderNodes(root.children, components, defaultContext);
}

function renderNodes(
  nodes: unknown[] | undefined,
  components: Record<string, ComponentType>,
  context: RenderContext,
) {
  if (nodes == null || nodes.length === 0) {
    return null;
  }

  const rendered: ReactNode[] = [];

  for (const [index, node] of nodes.entries()) {
    rendered.push(renderNode(node as MdastNode, index, components, context));
  }

  return rendered;
}

function renderNode(
  node: MdastNode,
  index: number,
  components: Record<string, ComponentType>,
  context: RenderContext,
): ReactNode {
  switch (node.type) {
    case `root`:
      return (
        <Fragment key={index}>
          {renderNodes(node.children, components, context)}
        </Fragment>
      );
    case `text`:
      return node.value ?? ``;
    case `paragraph`:
      return createFromComponent(
        components,
        `p`,
        index,
        null,
        renderNodes(node.children, components, context),
      );
    case `strong`:
      return createFromComponent(
        components,
        `strong`,
        index,
        null,
        renderNodes(node.children, components, context),
      );
    case `emphasis`:
      return createFromComponent(
        components,
        `em`,
        index,
        null,
        renderNodes(node.children, components, context),
      );
    case `mark`:
    case `flexibleMarker`:
      return createFromComponent(
        components,
        `mark`,
        index,
        null,
        renderNodes(node.children, components, context),
      );
    case `delete`:
      return createFromComponent(
        components,
        `del`,
        index,
        null,
        renderNodes(node.children, components, context),
      );
    case `inlineCode`:
      return createFromComponent(
        components,
        `inlineCode`,
        index,
        null,
        node.value ?? ``,
      );
    case `code`:
      return createFromComponent(
        components,
        `code`,
        index,
        null,
        node.value ?? ``,
      );
    case `heading`: {
      const level = Math.max(1, Math.min(6, node.depth ?? 1));
      return createFromComponent(
        components,
        `h${level}`,
        index,
        null,
        renderNodes(node.children, components, context),
      );
    }
    case `list`:
      return createFromComponent(
        components,
        node.ordered === true ? `ol` : `ul`,
        index,
        null,
        renderNodes(node.children, components, context),
      );
    case `listItem`:
      return createFromComponent(
        components,
        `li`,
        index,
        null,
        renderNodes(node.children, components, context),
      );
    case `link`:
      return createFromComponent(
        components,
        `a`,
        index,
        { href: node.url, title: node.title },
        renderNodes(node.children, components, context),
      );
    case `blockquote`:
      return createFromComponent(
        components,
        `blockquote`,
        index,
        null,
        renderNodes(node.children, components, context),
      );
    case `thematicBreak`:
      return createFromComponent(components, `hr`, index, null, null);
    case `break`:
      return createFromComponent(components, `br`, index, null, null);
    case `table`: {
      const rows = (node.children ?? []) as MdastNode[];
      const head = rows.at(0);
      const body = rows.slice(1);

      return createFromComponent(
        components,
        `table`,
        index,
        null,
        <>
          {head == null
            ? null
            : createFromComponent(
                components,
                `thead`,
                `thead`,
                null,
                renderNode(head, 0, components, { inTableHeader: true }),
              )}

          {body.length === 0
            ? null
            : createFromComponent(
                components,
                `tbody`,
                `tbody`,
                null,
                renderTableBodyRows(body, components),
              )}
        </>,
      );
    }
    case `tableRow`:
      return createFromComponent(
        components,
        `tr`,
        index,
        null,
        renderNodes(node.children, components, context),
      );
    case `tableCell`:
      return createFromComponent(
        components,
        context.inTableHeader ? `th` : `td`,
        index,
        null,
        renderNodes(node.children, components, context),
      );
    case `mdxJsxFlowElement`:
    case `mdxJsxTextElement`: {
      if (node.name == null || node.name.length === 0) {
        return (
          <Fragment key={index}>
            {renderNodes(node.children, components, context)}
          </Fragment>
        );
      }

      return createFromComponent(
        components,
        node.name,
        index,
        attrsToProps(node.attributes),
        renderNodes(node.children, components, context),
      );
    }
    default:
      if (node.children != null) {
        return (
          <Fragment key={index}>
            {renderNodes(node.children, components, context)}
          </Fragment>
        );
      }
      return node.value ?? null;
  }
}

function renderTableBodyRows(
  rows: MdastNode[],
  components: Record<string, ComponentType>,
) {
  const rendered: ReactNode[] = [];

  for (const [index, row] of rows.entries()) {
    rendered.push(
      renderNode(row, index + 1, components, {
        inTableHeader: false,
      }),
    );
  }

  return rendered;
}

function createFromComponent(
  components: Record<string, ComponentType>,
  name: string,
  key: string | number,
  props: Record<string, unknown> | null,
  children: ReactNode,
) {
  const Component = components[name];
  if (Component == null) {
    return null;
  }

  return createElement(Component, { ...props, key }, children);
}

function attrsToProps(
  attributes: unknown[] | undefined,
): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  for (const attr of attributes ?? []) {
    const candidate = attr as MdastAttribute;
    if (candidate.type !== `mdxJsxAttribute`) {
      continue;
    }
    if (candidate.name == null || candidate.name.length === 0) {
      continue;
    }

    const value = candidate.value;
    if (value == null) {
      props[candidate.name] = true;
      continue;
    }

    if (
      typeof value === `string` ||
      typeof value === `number` ||
      typeof value === `boolean`
    ) {
      props[candidate.name] = value;
    }
  }

  return props;
}
