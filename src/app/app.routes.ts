import { Routes } from '@angular/router';
import { DiscoverPage } from './features/discover/discover.page';

export const routes: Routes = [
  { path: '', component: DiscoverPage, title: 'MarketChat' },
  {
    path: 'm/:merchantId',
    loadComponent: () => import('./features/merchant/merchant.page').then((m) => m.MerchantPageComponent),
    title: 'MarketChat',
  },
  { path: 'cart', loadComponent: () => import('./features/cart/cart.page').then((m) => m.CartPage), title: 'MarketChat · Panier' },
  { path: 'checkout', loadComponent: () => import('./features/checkout/checkout.page').then((m) => m.CheckoutPage), title: 'MarketChat · Commande' },
  { path: 'orders', loadComponent: () => import('./features/orders/orders.page').then((m) => m.OrdersPage), title: 'MarketChat · Commandes' },
  { path: 'orders/:number', loadComponent: () => import('./features/orders/order.page').then((m) => m.OrderPage), title: 'MarketChat · Commande' },
  { path: 'auth/callback', loadComponent: () => import('./features/auth/auth-callback.page').then((m) => m.AuthCallbackPage) },
  { path: '**', redirectTo: '' },
];
