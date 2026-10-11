import { inject, Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UtilsService {
  private translateService = inject(TranslateService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private enLabels: Record<string, string> | null = null;

  constructor() {
    addIcons({ closeOutline });
  }

  async confirm(
    header = 'LBL_CONFIRM',
    message = 'LBL_CONFIRM_MESSAGE',
    params?: any,
    cancelLabel = 'LBL_NO',
    confirmLabel = 'LBL_YES',
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: await this.translate(header),
        message: await this.translate(message, params),
        buttons: [
          {
            text: await this.translate(cancelLabel),
            role: 'cancel',
            cssClass: 'secondary',
            handler: () => {
              resolve(false);
            },
          },
          {
            text: await this.translate(confirmLabel),
            handler: () => {
              resolve(true);
            },
          },
        ],
      });
      await alert.present();
    });
  }

  async showToast(
    message: string,
    kind: 'success' | 'error' | 'warning' = 'success',
    duration = 2000,
    position: 'top' | 'bottom' | 'middle' = 'top',
  ) {
    const color =
      kind === 'error' ? 'danger' : kind === 'warning' ? 'warning' : 'success';
    const closeLabel = await this.translate('ARIA_CLOSE');
    const t = await this.toastController.create({
      message: await this.translate(message, {}),
      duration,
      position,
      color,
      buttons: [
        {
          icon: 'close-outline',
          side: 'end',
          role: 'cancel',
          htmlAttributes: {
            'aria-label': closeLabel,
          },
        },
      ],
    });
    await t.present();
  }

  async translate(text: string, params: any = {}): Promise<string> {
    return await lastValueFrom(this.translateService.get(text, params));
  }

  /** Always English — used for PDF/Excel export labels. */
  async translateEn(key: string, params: Record<string, unknown> = {}): Promise<string> {
    if (!this.enLabels) {
      const res = await fetch('assets/i18n/en.json');
      this.enLabels = (await res.json()) as Record<string, string>;
    }
    let value = this.enLabels[key] ?? key;
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{{${k}}}`, String(v));
    }
    return value;
  }
}
