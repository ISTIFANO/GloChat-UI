import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { MerchantPage } from '../../core/api/contracts';
import { MerchantPageComponent } from './merchant.page';

const PAGE: MerchantPage = {
  merchant: {
    id: 'm-smash', name: 'Smash Agdal', emoji: '🍔', description: 'Burgers smashés minute.',
    cuisineTags: ['burger'], logoUrl: '/api/catalog/media/merchants/m-smash-logo.svg',
    coverUrl: '/api/catalog/media/merchants/m-smash-cover.webp',
    open: true, todayHours: '11:00–23:30', delivers: true, distanceKm: 1.2, etaText: '20–30 min',
    deliveryFee: 9, minOrderAmount: 40, acceptsCash: true, acceptsCard: true,
  },
  sections: [
    { id: 'c-burgers', name: 'Burgers', products: [{
      productId: 'p-1', name: 'Double smash', shortDescription: 'Deux steaks', price: 65,
      imageUrl: '/api/catalog/media/products/p-1.webp', visual: { emoji: '🍔', from: '#fff', to: '#000' },
    }] },
    { id: 'c-drinks', name: 'Boissons', products: [] },
  ],
} as unknown as MerchantPage;

const settle = async (fixture: { whenStable(): Promise<unknown>; detectChanges(): void }) => {
  await new Promise((r) => setTimeout(r));
  fixture.detectChanges();
  await fixture.whenStable();
};

describe('MerchantPageComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MerchantPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('loads the merchant from the gateway and renders branding, terms and menu sections', async () => {
    const fixture = TestBed.createComponent(MerchantPageComponent);
    fixture.componentRef.setInput('merchantId', 'm-smash');
    fixture.detectChanges();
    const req = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/api/catalog/merchants/m-smash'));
    expect(req.request.params.get('lat')).not.toBeNull();
    req.flush(PAGE);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Smash Agdal');
    expect(el.querySelector('img[src$="m-smash-logo.svg"]')).not.toBeNull();
    expect(el.querySelectorAll('nav button').length).toBe(2);
    expect(el.textContent).toContain('Double smash');
    expect(el.textContent).toContain('20–30 min');
  });

  it('shows a friendly message for an unknown merchant', async () => {
    const fixture = TestBed.createComponent(MerchantPageComponent);
    fixture.componentRef.setInput('merchantId', 'nope');
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/merchants/nope'))
      .flush({ code: 'MERCHANT_NOT_FOUND', title: 'Not found', status: 404 }, { status: 404, statusText: 'Not Found' });
    await settle(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('n’existe pas');
  });
});
