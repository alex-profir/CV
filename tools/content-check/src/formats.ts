import { COUNTRY_CODES } from './countries.ts';

// The WHATWG definition of a valid email address, the one browsers apply to
// <input type="email"> (research R4).
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value);
}

// An absolute web address: parses as a URL, uses http or https, has a host and
// contains no whitespace.
export function isWebAddress(value: string): boolean {
  if (/\s/.test(value)) return false;
  const url = URL.parse(value);
  return url !== null && (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== '';
}

export function isCountryCode(value: string): boolean {
  return COUNTRY_CODES.includes(value);
}

export type FormatRule = { test: (value: string) => boolean; detail: (value: string) => string };

export const WEB_ADDRESS: FormatRule = {
  test: isWebAddress,
  detail: (value) => `${JSON.stringify(value)} is not an absolute web address (http or https)`,
};

// The check's rule for each schema `format` it supports. A rules file using any
// other format can't be used (contracts/site-data-rules.md).
export const FORMAT_RULES: Record<string, FormatRule> = {
  email: { test: isEmail, detail: (value) => `${JSON.stringify(value)} is not a well-formed email address` },
  uri: WEB_ADDRESS,
};

export const COUNTRY_CODE: FormatRule = {
  test: isCountryCode,
  detail: (value) => `${JSON.stringify(value)} is not a two-letter ISO 3166-1 country code`,
};
