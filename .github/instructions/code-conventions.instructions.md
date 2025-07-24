---
applyTo: "**/*.ts,**/*.tsx"
---

# Code Conventions

This document outlines code conventions for this codebase. These conventions are intended to guide AI coding agents and human contributors to write code that is consistent, maintainable, and aligned with existing styles.

## Discriminated Unions in TypeScript

- **Use `kind` as the discriminator property**
  When defining discriminated unions in TypeScript, always use a property named `kind` rather than `type`.
  - This avoids naming conflicts, since interfaces and types are often suffixed with `Type` to prevent clashes with React components.
  - The discriminator's type should be suffixed with `Kind` (e.g., `FooKind`), ensuring clear and conflict-free naming.

**Example:**

```typescript
export type ShapeKind = "circle" | "square";

export interface CircleType {
  kind: "circle";
  radius: number;
}

export interface SquareType {
  kind: "square";
  side: number;
}

export type ShapeType = CircleType | SquareType;
```

## Avoid `useCallback` and `useMemo` with React Compiler

- **Do not use `useCallback` or `useMemo`**
  When using the React Compiler, you do not need to manually optimize functions or values with `useCallback` or `useMemo`. The compiler automatically optimizes re-renders and memoization, making these hooks unnecessary in most cases.
- **Write code naturally**
  Prefer writing straightforward code without premature optimization. Let the compiler handle performance concerns related to memoization.

**Example:**

```tsx
// ✅ No need for useCallback or useMemo
function MyComponent({ onClick }: { onClick: () => void }) {
  function handleClick() {
    // ...logic
    onClick();
  }

  return <button onClick={handleClick}>Click me</button>;
}
```
