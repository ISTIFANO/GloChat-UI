/**
 * API contracts — exactly the JSON returned by the api-gateway (commerce-service, spec §8).
 * Only endpoints that exist in the backend are typed here; cart/checkout arrive with Inc 2-3.
 */

export type Lang = 'fr' | 'ar' | 'en';

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface MerchantSummary {
  id: string;
  name: string;
  emoji: string;
  cuisine: string;
  /** relative to the gateway, e.g. /api/catalog/media/merchants/m-smash-logo.svg */
  logoUrl: string | null;
}

/** Licence-free product visual: an emoji on a gradient (demo catalog). */
export interface ProductVisual {
  emoji: string;
  from: string;
  to: string;
}

/** POST /api/catalog/search → results[] */
export interface ProductCard {
  productId: string;
  name: string;
  shortDescription: string;
  visual: ProductVisual;
  /** relative to the gateway; null when the merchant has no photo (the visual is used instead) */
  imageUrl: string | null;
  price: number;
  currency: string;
  merchant: MerchantSummary;
  distanceKm: number;
  etaText: string;
  deliveryFee: number;
  tags: string[];
  needsConfiguration: boolean;
  merchantOpen: boolean;
}

export interface OptionValue {
  id: string;
  label: string;
  priceDelta: number;
  available: boolean;
}

export interface OptionGroup {
  id: string;
  name: string;
  type: 'SINGLE' | 'MULTI';
  minSelect: number;
  maxSelect: number;
  required: boolean;
  values: OptionValue[];
}

/** GET /api/catalog/products/{id} */
export interface ProductDetail {
  product: ProductCard;
  description: string;
  optionGroups: OptionGroup[];
}

/** GET /api/catalog/merchants/{id} */
export interface MerchantInfo {
  id: string;
  name: string;
  emoji: string;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;
  cuisineTags: string[];
  open: boolean;
  todayHours: string | null;
  distanceKm: number;
  etaText: string;
  deliveryFee: number;
  minOrderAmount: number;
  delivers: boolean;
  acceptsCash: boolean;
  acceptsCard: boolean;
}

export interface MenuSection {
  id: string;
  name: string;
  products: ProductCard[];
}

export interface MerchantPage {
  merchant: MerchantInfo;
  sections: MenuSection[];
}

export interface SearchRequest {
  query: string;
  location: GeoLocation;
  maxPrice?: number;
  partySize?: number;
  limit?: number;
}

export interface SearchResponse {
  results: ProductCard[];
}

/** RFC 7807 error body with the backend's stable code. */
export interface ApiProblem {
  status: number;
  detail?: string;
  code?: string;
  fields?: string[];
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    detail?: string,
  ) {
    super(detail ?? code);
    this.name = 'ApiError';
  }
}
