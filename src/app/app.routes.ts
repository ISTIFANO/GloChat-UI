import { Routes } from '@angular/router';
import { DiscoverPage } from './features/discover/discover.page';

export const routes: Routes = [
  { path: '', component: DiscoverPage, title: 'MarketChat' },
  {
    path: 'm/:merchantId',
    loadComponent: () => import('./features/merchant/merchant.page').then((m) => m.MerchantPageComponent),
    title: 'MarketChat',
  },
  { path: '**', redirectTo: '' },
];
