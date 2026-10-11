import { Injectable } from '@angular/core';

const THEME_KEY = 'hourforge_theme';
const SUPPORTED = ['auto', 'light', 'dark'] as const;
export type AppTheme = (typeof SUPPORTED)[number];

/** Pure resolve — dark when forced, never when light, else system. */
export function resolveDark(mode: AppTheme, systemDark: boolean): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemDark;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  current: AppTheme = 'auto';
  private media?: MediaQueryList;
  private onSystemChange = () => this.apply(this.current);

  init() {
    const saved = localStorage.getItem(THEME_KEY) as AppTheme | null;
    const mode = saved && SUPPORTED.includes(saved) ? saved : 'auto';
    this.media = window.matchMedia('(prefers-color-scheme: dark)');
    this.media.addEventListener('change', this.onSystemChange);
    this.apply(mode);
  }

  setTheme(mode: string) {
    const next = (SUPPORTED.includes(mode as AppTheme) ? mode : 'auto') as AppTheme;
    this.apply(next);
    localStorage.setItem(THEME_KEY, next);
  }

  private apply(mode: AppTheme) {
    this.current = mode;
    const systemDark = this.media?.matches ?? false;
    document.documentElement.classList.toggle(
      'ion-palette-dark',
      resolveDark(mode, systemDark),
    );
  }
}
