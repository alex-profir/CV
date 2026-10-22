// Just enough JSX for the fixture to compile with no React types: any element,
// with a style object.
declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [element: string]: { style?: Record<string, string | number | undefined> };
  }
}
