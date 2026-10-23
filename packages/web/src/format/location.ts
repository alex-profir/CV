// The location line (FR-008, research R7): city, region and the country's
// common English name, each only when present.
import type { ResumeLocation } from '@cv/content';
import { siteText } from '../site-text.ts';

const REGIONS = new Intl.DisplayNames(['en'], { type: 'region' });

// The country's English name from CLDR, shipped with Node's ICU: "Romania",
// "United States", "South Korea".
export function countryName(code: string): string {
  return REGIONS.of(code) ?? code;
}

// Only the city, region and country code are shown (data-model.md Supported
// content).
export function locationLine({ city, region, countryCode }: ResumeLocation): string | null {
  const parts = [city, region, countryCode === undefined ? undefined : countryName(countryCode)].filter(
    (part): part is string => typeof part === 'string' && part !== '',
  );
  return parts.length === 0 ? null : parts.join(siteText.listSeparator);
}
