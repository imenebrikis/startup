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

// Amenity / house-rule vocabularies for the "more filters" controls. The `value`
// must stay in French to match stored data (listings.amenities / house_rules);
// `key` resolves the translated label. NOTE: FilterBar still has its own local
// copies for the desktop modal — these can be deduped to import from here later.
export const AMENITIES = [
  { value: "Climatisation", key: "ac" },
  { value: "Chauffage", key: "heating" },
  { value: "Wifi", key: "wifi" },
  { value: "Citerne d'eau", key: "waterTank" },
  { value: "Chauffe-eau", key: "waterHeater" },
  { value: "Groupe électrogène", key: "generator" },
  { value: "Parking / Garage", key: "parking" },
  { value: "Jardin / Terrasse", key: "garden" },
  { value: "Piscine", key: "pool" },
  { value: "Cuisine équipée", key: "kitchen" },
  { value: "Machine à laver", key: "washer" },
  { value: "Ascenseur", key: "elevator" },
  { value: "Vue sur mer", key: "seaView" },
  { value: "Sécurité (Caméras / Alarme)", key: "security" },
  { value: "Jacuzzi", key: "jacuzzi" },
];
export const CHECK_RULES = [
  { value: "Pas de fêtes", key: "noParties" },
  { value: "Familles uniquement", key: "familiesOnly" },
  { value: "Pas d'alcool", key: "noAlcohol" },
  { value: "Photos/Vidéos interdites", key: "noPhotos" },
  { value: "Pas d'invités tiers", key: "noThirdPartyGuests" },
];
export const SMOKING = [{ v: null, key: "any" }, { v: "Non-fumeur", key: "nonSmoker" }, { v: "Fumeur", key: "smoker" }];
export const PETS = [{ v: null, key: "any" }, { v: "Pas d'animaux", key: "noPets" }, { v: "Animaux acceptés", key: "petsAllowed" }];
