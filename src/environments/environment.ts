/**
 * PUBLIC configuration only — everything here ends up in the browser bundle.
 * Never put backend secrets here (they live in the backend repo's infra/.env).
 */
export const environment = {
  production: false,
  /** all calls go through the api-gateway (never directly to a service) */
  apiBaseUrl: 'http://localhost:8080',
  keycloak: {
    issuer: 'http://localhost:8180/realms/marketchat',
    clientId: 'marketchat-app',
  },
  /** Stripe publishable key (pk_test_…) is public by design; set it at deploy time */
  stripePublishableKey: '',
  defaultLocation: { label: 'Agdal, Rabat', lat: 33.9981, lng: -6.8497 },
};
