/**
 * Standard VAT rates for B2C electronically supplied services (place of
 * supply = customer's country, EU OSS). Basis points: 1900 = 19 %.
 *
 * ⚠ Rates change. Verify this table with a tax advisor before go-live and
 * whenever rates change. Note: some adult-friendly payment providers act as
 * merchant of record and handle VAT themselves — in that case the rate shown
 * here is informational and must match the provider's invoice.
 */
export const VAT_RATES_BP: Record<string, number> = {
  AT: 2000, BE: 2100, BG: 2000, HR: 2500, CY: 1900, CZ: 2100, DK: 2500, EE: 2400, FI: 2550, FR: 2000,
  DE: 1900, GR: 2400, HU: 2700, IE: 2300, IT: 2200, LV: 2100, LT: 2100, LU: 1700, MT: 1800, NL: 2100,
  PL: 2300, PT: 2300, RO: 2100, SK: 2300, SI: 2200, ES: 2100, SE: 2500,
};

/** Countries offered at checkout (EU + selected others). Non-EU defaults to 0 % unless registered. */
export const CHECKOUT_COUNTRIES = [...Object.keys(VAT_RATES_BP), "CH", "GB", "NO", "IS", "LI", "US", "CA", "AU"].sort();

export const vatRateFor = (country: string) => VAT_RATES_BP[country] ?? 0;

export const DEFAULT_COUNTRY_BY_LOCALE: Record<string, string> = { de: "DE", en: "GB", fr: "FR", es: "ES", it: "IT", nl: "NL", pl: "PL", pt: "PT" };
