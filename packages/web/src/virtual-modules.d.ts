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
