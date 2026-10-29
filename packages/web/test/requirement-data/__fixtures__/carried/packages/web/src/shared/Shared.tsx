export const Shared = () => <em data-req="002-example-FR-005" />;

// A helper, not a component: naming it in an inline Content doesn't make
// this module that app's content.
export const wide = (props: { narrow: boolean }) => !props.narrow;
