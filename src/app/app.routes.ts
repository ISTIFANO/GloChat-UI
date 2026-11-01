import { Routes } from '@angular/router';
import { DiscoverPage } from './features/discover/discover.page';

export const routes: Routes = [
  { path: '', component: DiscoverPage, title: 'GloChat' },
  {
    path: 'm/:merchantId',
    loadComponent: () => import('./features/merchant/merchant.page').then((m) => m.MerchantPageComponent),
    title: 'GloChat',
  },
  { path: 'cart', loadComponent: () => import('./features/cart/cart.page').then((m) => m.CartPage), title: 'GloChat · Panier' },
  { path: 'checkout', loadComponent: () => import('./features/checkout/checkout.page').then((m) => m.CheckoutPage), title: 'GloChat · Commande' },
  { path: 'orders', loadComponent: () => import('./features/orders/orders.page').then((m) => m.OrdersPage), title: 'GloChat · Commandes' },
  { path: 'orders/:number', loadComponent: () => import('./features/orders/order.page').then((m) => m.OrderPage), title: 'GloChat · Commande' },
  { path: 'auth/popup', loadComponent: () => import('./features/auth/auth-popup.page').then((m) => m.AuthPopupPage) },
  { path: 'auth/callback', loadComponent: () => import('./features/auth/auth-callback.page').then((m) => m.AuthCallbackPage) },
  { path: '**', redirectTo: '' },
];
