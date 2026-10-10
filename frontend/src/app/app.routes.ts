import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'job',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/detail/detail.page').then((m) => m.DetailPage),
  },
  {
    path: 'job/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/detail/detail.page').then((m) => m.DetailPage),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/list/list.page').then((m) => m.ListPage),
  },
];
