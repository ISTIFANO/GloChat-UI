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
