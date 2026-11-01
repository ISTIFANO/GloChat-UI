/**
 * Neighbourhoods offered in the address form. They provide the coordinates used for distance and delivery fee
 * (no geocoding service yet); the customer types the street details. Casablanca is outside every Rabat zone.
 */
export interface Area {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

export const AREAS: Area[] = [
  { id: 'agdal', name: 'Agdal', city: 'Rabat', lat: 33.9981, lng: -6.8497 },
  { id: 'hassan', name: 'Hassan', city: 'Rabat', lat: 34.0209, lng: -6.8416 },
  { id: 'souissi', name: 'Souissi', city: 'Rabat', lat: 33.985, lng: -6.83 },
  { id: 'hay-riad', name: 'Hay Riad', city: 'Rabat', lat: 33.9592, lng: -6.8722 },
  { id: 'maarif', name: 'Maârif', city: 'Casablanca', lat: 33.588, lng: -7.632 },
];
