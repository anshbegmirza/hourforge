import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const LANG_KEY = 'hourforge_lang';
const SUPPORTED = ['en', 'de', 'fr'] as const;
export type AppLang = (typeof SUPPORTED)[number];

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);
  current: AppLang = 'en';

  init() {
    const saved = localStorage.getItem(LANG_KEY) as AppLang | null;
    const lang = saved && SUPPORTED.includes(saved) ? saved : this.detect();
    this.apply(lang);
  }

  detect(): AppLang {
    const nav = (navigator.language || 'en').toLowerCase();
    if (nav.startsWith('de')) return 'de';
    if (nav.startsWith('fr')) return 'fr';
    return 'en';
  }

  async setLanguage(lang: string, persist = true) {
    const next = (SUPPORTED.includes(lang as AppLang) ? lang : 'en') as AppLang;
    this.apply(next);
    if (persist) {
      localStorage.setItem(LANG_KEY, next);
    }
  }

  /** BCP 47 locale for dates / datetime pickers. */
  get locale(): string {
    return { en: 'en-GB', de: 'de-DE', fr: 'fr-FR' }[this.current];
  }

  private apply(lang: AppLang) {
    this.current = lang;
    this.translate.use(lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }
}
