// `buffer` (009 FR-012, research R11), on the `buffer` package: the trailing
// slash names the package, not a built-in of that name.
import { Buffer, kMaxLength, SlowBuffer, INSPECT_MAX_BYTES } from 'buffer/';

export const bufferModule = { Buffer, SlowBuffer, kMaxLength, INSPECT_MAX_BYTES, constants: { MAX_LENGTH: kMaxLength, MAX_STRING_LENGTH: 536_870_888 } };

export { Buffer };
