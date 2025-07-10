/**
 * A utility type that ensures a string literal matches the name of a type or symbol.
 * This is used with type assertions to provide compile-time checking that string
 * literals correctly reference type names.
 *
 * @example
 * // Valid usage - string matches the symbol name
 * const className = 'MyComponent' as NameOf<typeof MyComponent>;
 * const typeName = 'UserInterface' as NameOf<UserInterface>;
 *
 * // Invalid usage - would be caught by ESLint rule
 * const wrong = 'WrongName' as NameOf<typeof MyComponent>; // ESLint error
 *
 * @template T - The type or typeof expression to extract the name from
 */
declare global {
  type NameOf<T> = string;
}

// This export statement is required to make this file a module
// and ensure the global declarations are properly recognized
export {};
