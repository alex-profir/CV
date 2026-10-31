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
