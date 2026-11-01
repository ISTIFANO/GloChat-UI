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
  [extra: string]: unknown;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    detail?: string,
    /** full RFC 7807 body (e.g. PRICE_CHANGED carries the new quote, conflicts carry ids) */
    public readonly problem: ApiProblem | null = null,
  ) {
    super(detail ?? code);
    this.name = 'ApiError';
  }
}

// ───────────── cart (GET /api/cart) ─────────────
export type PaymentMethod = 'CASH' | 'CARD';

export interface CartSelection {
  groupId: string;
  group: string;
  valueId: string;
  label: string;
  priceDelta: number;
}

export interface CartLine {
  lineId: string;
  productId: string;
  name: string | null;
  imageUrl: string | null;
  emoji: string | null;
  quantity: number;
  note: string | null;
  selections: CartSelection[];
  unitPrice: number;
  lineTotal: number;
  available: boolean;
  unavailableReason: string | null;
}

export interface CartIssue {
  code: string;
  missing: number | null;
  lineId: string | null;
}

export interface CartDelivery {
  label: string;
  line: string;
  city: string;
  lat: number;
  lng: number;
  distanceKm: number | null;
  inZone: boolean | null;
  fee: number | null;
  etaText: string | null;
}

export interface CartView {
  cartId: string | null;
  version: number;
  currency: string;
  merchant: { id: string; name: string; emoji: string; logoUrl: string | null; open: boolean } | null;
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  delivery: CartDelivery | null;
  minimumOrder: number | null;
  total: number;
  paymentMethod: PaymentMethod | null;
  acceptedPaymentMethods: PaymentMethod[];
  issues: CartIssue[];
}

export type CartOperation =
  | { op: 'ADD'; productId: string; quantity: number; optionValueIds: string[]; note?: string }
  | { op: 'UPDATE'; lineId: string; quantity?: number; note?: string }
  | { op: 'REMOVE'; lineId: string }
  | { op: 'CLEAR' };

export interface AddressInput {
  label: string;
  line: string;
  city: string;
  lat: number;
  lng: number;
}

export interface SavedAddress extends AddressInput {
  id: string;
}

// ───────────── checkout ─────────────
export interface QuoteLine {
  productId: string;
  name: string;
  imageUrl: string | null;
  emoji: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  note: string | null;
  selections: { group: string; label: string; priceDelta: number }[];
}

export interface QuoteView {
  quoteId: string;
  confirmationToken: string;
  expiresAt: string;
  merchant: { id: string; name: string; emoji: string; logoUrl: string | null };
  lines: QuoteLine[];
  delivery: { label: string; line: string; city: string; distanceKm: number | null; etaText: string | null };
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  currency: string;
  paymentMethod: PaymentMethod;
}

// ───────────── orders ─────────────
export type OrderStatus = 'AWAITING_PAYMENT' | 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELED';

export interface OrderView {
  id: string;
  number: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CASH_ON_DELIVERY';
  paymentUrl: string | null;
  merchant: { id: string; name: string; emoji: string; logoUrl: string | null };
  lines: QuoteLine[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  currency: string;
  delivery: { label: string; line: string; city: string };
  etaText: string;
  createdAt: string;
  cancellable: boolean;
  history: { status: OrderStatus; at: string; actor: string }[];
}
