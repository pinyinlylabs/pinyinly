// Test file to verify prettier formatting
export const testFunction = (x: number, y: string) => {
  const result = {
    value: x,
    name: y,
    timestamp: new Date().toISOString(),
  };
  return result;
};

// Intentionally bad formatting
export const anotherFunction = (a: string, b: number) => {
  return { x: a, y: b };
};
