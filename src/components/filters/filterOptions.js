// `value` is the canonical value persisted to / filtered against the DB; `key`
// only resolves the user-facing label, so translating never breaks filtering.
export const TYPE_OPTIONS = [
  { value: "exchange", key: "exchange" },
  { value: "sale", key: "sale" },
  { value: "both", key: "both" },
];

// Values stored in listings.property_type (AddListing); key → translated label.
export const LOGEMENT_OPTIONS = [
  { value: "maison", key: "maison" },
  { value: "appart", key: "appart" },
  { value: "villa", key: "villa" },
  { value: "studio", key: "studio" },
  { value: "penthouse", key: "penthouse" },
];
