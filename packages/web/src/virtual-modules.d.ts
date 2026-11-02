// The build's virtual modules, for `tsc` (006 contracts/site.md).
declare module 'virtual:cv-spec-list' {
  const specList: import('../scripts/spec-list.ts').SpecList;
  export default specList;
}

// The CV's declaration file for the Playground's code (008 research R10).
declare module 'virtual:cv-types' {
  const cvTypes: string;
  export default cvTypes;
}

// The runner's frame script, the worker's runtime and the frame's policy
// (008 contracts/runner.md), bundled by the build for the engine.
declare module 'virtual:playground-runner' {
  export const bootstrap: string;
  export const runtime: string;
  export const policy: string;
}

// The program bundle's scripts (009 research R13).
declare module 'virtual:terminal-program' {
  export const bootstrap: string;
  export const runtime: string;
  export const policy: string;
}

// The `buffer` package, named so that it isn't Node's built-in (009 research R11).
declare module 'buffer/' {
  export const Buffer: typeof import('node:buffer').Buffer;
  export const SlowBuffer: unknown;
  export const kMaxLength: number;
  export const INSPECT_MAX_BYTES: number;
}
