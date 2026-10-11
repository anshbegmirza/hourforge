import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonList,
  IonHeader,
  IonToolbar,
  IonTitle,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from 'src/app/services/auth.service';
import { LanguageService } from 'src/app/services/language.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonList,
    IonHeader,
    IonToolbar,
    IonTitle,
    TranslatePipe,
  ],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private utils = inject(UtilsService);
  private language = inject(LanguageService);

  mode: 'login' | 'register' = 'login';
  name = '';
  username = '';
  email = '';
  login = '';
  password = '';
  busy = false;

  async submit() {
    if (this.busy) return;
    this.busy = true;
    try {
      if (this.mode === 'register') {
        await this.auth.register(
          this.name,
          this.email,
          this.password,
          this.language.current,
          this.username,
        );
      } else {
        await this.auth.login(this.login, this.password);
      }
      if (this.auth.user?.preferredLang) {
        await this.language.setLanguage(this.auth.user.preferredLang, false);
      }
      await this.router.navigateByUrl('/');
    } catch (err: any) {
      const msg =
        err?.error?.message ||
        (await this.utils.translate('AUTH_FAILED'));
      this.utils.showToast(msg, 'error');
    } finally {
      this.busy = false;
    }
  }

  switchMode() {
    this.mode = this.mode === 'login' ? 'register' : 'login';
  }
}
