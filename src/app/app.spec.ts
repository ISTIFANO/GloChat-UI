import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { I18n } from './core/i18n/i18n.service';

describe('App shell', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    }).compileComponents();
  });

  it('renders the brand, the search composer and suggestion chips', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('chat');
    expect(el.querySelector('input[name="q"]')).not.toBeNull();
    expect(el.querySelectorAll('.chip').length).toBeGreaterThanOrEqual(6);
  });

  it('switches to Arabic with right-to-left layout', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    TestBed.inject(I18n).lang.set('ar');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('شنو بغيتي تاكل');
  });
});
