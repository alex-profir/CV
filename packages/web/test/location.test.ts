// The location line: city, region and the country's common English name
// (research R7).
import { describe, expect, test } from 'vitest';
import { COUNTRY_CODES } from '../../../tools/content-check/src/countries.ts';
import { countryName, locationLine } from '../src/format/location.ts';

describe("004-cv-page-FR-008: the location shows the city, the region and the country's English name", () => {
  test('a city and a country code', () => {
    expect(locationLine({ city: 'Timișoara', countryCode: 'RO' })).toBe('Timișoara, Romania');
  });

  test('a city, a region and a country code', () => {
    expect(locationLine({ city: 'Austin', region: 'Texas', countryCode: 'US' })).toBe('Austin, Texas, United States');
  });

  test('common English names, not ISO formal names', () => {
    expect(countryName('KR')).toBe('South Korea');
    expect(countryName('NL')).toBe('Netherlands');
    expect(countryName('US')).toBe('United States');
  });

  test('each part only when present, and nothing for an empty location', () => {
    expect(locationLine({ city: 'Brașov' })).toBe('Brașov');
    expect(locationLine({ region: 'Bavaria' })).toBe('Bavaria');
    expect(locationLine({ countryCode: 'DE' })).toBe('Germany');
    expect(locationLine({ region: 'Bavaria', countryCode: 'DE' })).toBe('Bavaria, Germany');
    expect(locationLine({})).toBeNull();
    expect(locationLine({ address: 'Somewhere 1', postalCode: '300000' })).toBeNull();
  });

  test('every one of the 249 codes the content check accepts gets a name that is not the code', () => {
    expect(COUNTRY_CODES).toHaveLength(249);
    for (const code of COUNTRY_CODES) {
      const name = countryName(code);
      expect(name, code).not.toBe(code);
      expect(name.length, code).toBeGreaterThan(2);
    }
  });
});
