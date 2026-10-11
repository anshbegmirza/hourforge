import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ModalController,
  IonButton,
  IonIcon,
  IonFooter,
  IonItem,
  IonList,
  IonButtons,
  IonContent,
  IonBackButton,
  IonToolbar,
  IonHeader,
  IonTitle,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';
import { CustomerService } from 'src/app/services/customer.service';
import { EmployeeService } from 'src/app/services/employee.service';
import { Employee } from 'src/app/models/employee';
import { Customer } from 'src/app/models/customer';
import {
  addOutline,
  trashOutline,
  pencilSharp,
  chevronBackOutline,
  refreshOutline,
  logOutOutline,
  contrastOutline,
  sunnyOutline,
  moonOutline,
} from 'ionicons/icons';
import { AddModelComponent } from '../add-model/add-model.component';
import { addIcons } from 'ionicons';
import { UtilsService } from 'src/app/services/utils.service';
import { JobService } from 'src/app/services/job.service';
import { TranslatePipe } from '@ngx-translate/core';
import { Job } from 'src/app/models/job';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { LanguageService } from 'src/app/services/language.service';
import { AppTheme, ThemeService } from 'src/app/services/theme.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [
    IonTitle,
    IonHeader,
    IonToolbar,
    IonBackButton,
    IonContent,
    IonButtons,
    IonList,
    IonItem,
    IonFooter,
    IonIcon,
    IonButton,
    IonSelect,
    IonSelectOption,
    CommonModule,
    FormsModule,
    RouterModule,
    TranslatePipe,
  ],
})
export class SettingsPage implements OnInit {
  environment = environment;

  private customerService = inject(CustomerService);
  private employeeService = inject(EmployeeService);
  private utilsService = inject(UtilsService);
  public modalCtrl = inject(ModalController);
  private jobService = inject(JobService);
  private authService = inject(AuthService);
  languageService = inject(LanguageService);
  private themeService = inject(ThemeService);

  employees?: Employee[];
  customers?: Customer[];
  jobs?: Job[];
  selectedLang = this.languageService.current;
  selectedTheme = this.themeService.current;
  readonly themeOptions: AppTheme[] = ['auto', 'light', 'dark'];
  readonly themeIcons: Record<AppTheme, string> = {
    auto: 'contrast-outline',
    light: 'sunny-outline',
    dark: 'moon-outline',
  };

  constructor() {
    addIcons({
      addOutline,
      trashOutline,
      pencilSharp,
      chevronBackOutline,
      refreshOutline,
      logOutOutline,
      contrastOutline,
      sunnyOutline,
      moonOutline,
    });
  }

  ngOnInit() {
    this.employees = this.employeeService.all();
    this.customers = this.customerService.all();
  }

  async openAddModel(type: 'employee' | 'customer', data?: any) {
    const isEmployee = type === 'employee';
    const modal = await this.modalCtrl.create({
      component: AddModelComponent,
      componentProps: {
        isEmployee,
        isEditData: data,
      },
      backdropDismiss: true,
      cssClass: [
        'hf-dialog',
        isEmployee ? 'hf-dialog--sm' : 'hf-dialog--md',
      ],
    });

    modal.onDidDismiss().then(async (result) => {
      if (result.data) {
        const entityType = result.data.type as 'employee' | 'customer';
        const isUpdate = !!data;

        if (entityType === 'customer') {
          if (isUpdate) {
            await this.customerService.update(result.data.data);
          } else {
            await this.customerService.add(result.data.data);
          }
          this.customers = this.customerService.all();
        }

        if (entityType === 'employee') {
          if (isUpdate) {
            await this.employeeService.update(result.data.data);
          } else {
            await this.employeeService.add(result.data.data);
          }
          this.employees = this.employeeService.all();
        }

        this.showToastMsg(entityType, isUpdate);
      }
    });

    await modal.present();
  }

  async showToastMsg(entityType: 'employee' | 'customer', isUpdate: boolean) {
    let translationKey = '';
    if (entityType === 'employee') {
      translationKey = isUpdate ? 'EMPLOYEE_UPDATED' : 'EMPLOYEE_ADDED';
    } else {
      translationKey = isUpdate ? 'COMPANY_UPDATED' : 'COMPANY_ADDED';
    }

    const message = await this.utilsService.translate(translationKey);
    this.utilsService.showToast(message);
  }

  async openConfirmModel(
    type: 'employee' | 'customer' | 'reset' | 'job',
    target: 'all' | any,
    employeeName?: string,
  ) {
    let header = 'LBL_CONFIRM';
    let message = '';
    let toastKey = '';

    switch (type) {
      case 'reset':
        message = 'RESET_CONFIRM';
        toastKey = 'APP_RESET';
        break;

      case 'job':
        message = 'DELETE_SINGLE_CONFIRM';
        toastKey = 'DELETE_SINGLE_JOB';
        break;

      case 'employee':
      case 'customer':
        if (target === 'all') {
          message = 'DELETE_ALL_CONFIRM';
          toastKey =
            type === 'customer'
              ? 'ALL_CUSTOMERS_DELETED'
              : 'ALL_EMPLOYEES_DELETED';
        } else {
          message = 'DELETE_SINGLE_CONFIRM';
          toastKey =
            type === 'customer' ? 'CUSTOMER_DELETED' : 'EMPLOYEE_DELETED';
        }
        break;
    }

    const translatedType = await this.utilsService.translate(
      type === 'customer' ? 'CUSTOMER' : 'EMPLOYEE',
    );

    const confirmed = await this.utilsService.confirm(
      header,
      message,
      {
        type: translatedType,
        name: employeeName || '',
      },
      'LBL_NO',
      'LBL_YES',
    );

    if (confirmed) {
      await this.handleDelete(type, target);
      if (toastKey) this.utilsService.showToast(toastKey);
    }
  }

  async handleDelete(
    type: 'employee' | 'customer' | 'reset' | 'job',
    target: 'all' | any,
  ) {
    if (type === 'employee') {
      if (target === 'all') {
        this.employees = [];
        await this.employeeService.reset();
      } else {
        this.employees = this.employees?.filter((emp) => emp.id !== target.id);
        await this.employeeService.remove(target);
      }
      if (target !== 'all') await this.showToastMsg('employee', true);
    }

    if (type === 'customer') {
      if (target === 'all') {
        this.customers = [];
        await this.customerService.reset();
      } else {
        this.customers = this.customers?.filter(
          (c) => c.companyName !== target.companyName,
        );
        await this.customerService.remove(target);
      }
      if (target !== 'all') await this.showToastMsg('customer', true);
    }

    if (type === 'reset') {
      this.employees = [];
      this.customers = [];
      await this.customerService.reset();
      await this.employeeService.reset();
      await this.jobService.reset();

      this.utilsService.showToast('APP_RESET');
    }
  }

  async onLanguageChange(lang: string) {
    await this.languageService.setLanguage(lang);
    if (this.authService.isLoggedIn) {
      try {
        await this.authService.updatePreferredLang(lang);
      } catch {
        // local preference still applied
      }
    }
  }

  onThemeChange(mode: AppTheme) {
    this.selectedTheme = mode;
    this.themeService.setTheme(mode);
  }

  async logout() {
    const confirmed = await this.utilsService.confirm(
      'AUTH_LOGOUT',
      'AUTH_LOGOUT_CONFIRM',
    );
    if (confirmed) {
      this.authService.logout();
    }
  }

  reload() {
    window.location.reload();
  }
}
