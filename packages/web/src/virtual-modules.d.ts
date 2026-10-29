// The build's virtual modules, for `tsc` (006 contracts/site.md).
declare module 'virtual:cv-spec-list' {
  const specList: import('../scripts/spec-list.ts').SpecList;
  export default specList;
}
