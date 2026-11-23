/**
 * Seller / legal entity details shown in the Legal Notice and on receipts.
 * ⚠ PLACEHOLDERS — must be replaced with the real operator details and
 * reviewed by a qualified professional before going live.
 */
export const legalEntity = {
  name: process.env.LEGAL_ENTITY_NAME ?? "[Operator name / company]",
  representative: process.env.LEGAL_REPRESENTATIVE ?? "[Authorised representative]",
  address: process.env.LEGAL_ADDRESS ?? "[Street, postcode, city, country]",
  email: process.env.LEGAL_EMAIL ?? "[legal contact email]",
  vatId: process.env.LEGAL_VAT_ID ?? "[VAT ID]",
  register: process.env.LEGAL_REGISTER ?? "",
  youthProtectionOfficer: process.env.LEGAL_YOUTH_PROTECTION_OFFICER ?? "[Youth protection officer (Jugendschutzbeauftragte/r), if required]",
  isPlaceholder: !process.env.LEGAL_ENTITY_NAME,
};
