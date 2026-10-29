describe('002-example-FR-001 group', () => {
  test('plain title', () => {});
  test(`for the ${shell} shell`, () => {});
  test(titleOf('x'), { tags: ['002-example-FR-002'] }, () => {});
  test.skip('002-example-FR-003 skipped', () => {});
  it.todo('002-example-FR-004 todo');
  test.skipIf(true)('002-example-FR-005 skipIf', () => {});
  test.weird('002-example-FR-006 unrecognized', () => {});
});
describe.skip('002-example-FR-007 skipped group', () => {
  test('inside a skipped group 002-example-FR-008', () => {});
});
test("it's 002-example-FR-009", () => {});
