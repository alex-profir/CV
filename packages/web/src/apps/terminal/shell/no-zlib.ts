// `node:zlib` for the worker build (006 research R34): just-bash's browser
// build imports it for `gzip` and `tar`, which the Terminal leaves out
// (R32). Each function throws, so the worker ships no Node code.
const missing = (name: string) => (): never => {
  throw new Error(`zlib.${name} is not available in the Terminal's shell`);
};

export const gzipSync = missing('gzipSync');
export const gunzipSync = missing('gunzipSync');
export const constants: Readonly<Record<string, number>> = {};

export default { gzipSync, gunzipSync, constants };
