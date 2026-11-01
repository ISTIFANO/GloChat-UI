import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Adds the Keycloak access token to calls to OUR gateway only (never to third parties), refreshing it when
 * needed; on a 401 it refreshes once and retries.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl + '/api/')) return next(req);
  const auth = inject(AuthService);
  return from(auth.validAccessToken()).pipe(
    switchMap((token) => {
      const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
      return next(authed).pipe(
        catchError((e: unknown) => {
          if (!(e instanceof HttpErrorResponse) || e.status !== 401 || !token) return throwError(() => e);
          return from(auth.refresh()).pipe(
            switchMap((ok) => {
              const fresh = ok ? auth.validAccessToken() : Promise.resolve(null);
              return from(fresh).pipe(
                switchMap((t) => (t ? next(req.clone({ setHeaders: { Authorization: `Bearer ${t}` } })) : throwError(() => e))),
              );
            }),
          );
        }),
      );
    }),
  );
};
