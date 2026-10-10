import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn) {
    return router.createUrlTree(['/login']);
  }

  try {
    if (!auth.user) {
      await auth.refreshMe();
    }
    if (!auth.dataLoaded) {
      await auth.loadAppData();
    }
  } catch {
    auth.logout();
    return router.createUrlTree(['/login']);
  }

  return true;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn) {
    return router.createUrlTree(['/']);
  }
  return true;
};
