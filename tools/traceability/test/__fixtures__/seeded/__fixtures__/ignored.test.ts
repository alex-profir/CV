// Never read: __fixtures__/ is excluded (FR-014). A malformed ID and a syntax error would otherwise be reported.
test('ignored FR-1', () => {
  foo(;
});
