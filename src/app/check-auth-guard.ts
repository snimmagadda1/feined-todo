/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const CheckAuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isAuth$().pipe(
    tap(isAuth => {
      console.log('isAuth', isAuth);
    }),
    map(isAuth => (isAuth ? router.parseUrl('/home') : true)),
  );
};
