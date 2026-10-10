import { ModalController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { UtilsService } from 'src/app/services/utils.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-delete-model',
  templateUrl: './delete-model.component.html',
  styleUrls: ['./delete-model.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslatePipe],
})
export class DeleteModelComponent implements OnInit {
  private modalCtrl = inject(ModalController);

  @Input() type!: 'employee' | 'customer' | 'reset' | 'job';
  @Input() target!: 'all' | any;

  private utilsService = inject(UtilsService);

  public msgToShow: string = '';
  private translate = inject(TranslateService);
  constructor() {
    addIcons({ closeOutline });
  }

  ngOnInit(): void {
    this.setMessage();
  }

  confirmDelete() {
    this.modalCtrl.dismiss({ confirmed: true });

    let toastKey = '';

    if (this.type === 'reset') {
      toastKey = 'APP_RESET';
    } else {
      if (this.target === 'all') {
        toastKey =
          this.type === 'customer'
            ? 'ALL_CUSTOMERS_DELETED'
            : 'ALL_EMPLOYEES_DELETED';
      } else {
        toastKey =
          this.type === 'customer' ? 'CUSTOMER_DELETED' : 'EMPLOYEE_DELETED';
      }
    }

    if (this.type === 'job') {
      toastKey = 'DELETE_SINGLE_JOB';
    }

    this.utilsService.showToast(toastKey);
  }

  closeModal() {
    this.modalCtrl.dismiss({ confirmed: false });
  }

  setMessage() {
    switch (this.type) {
      case 'reset':
        this.msgToShow = this.translate.instant('RESET_CONFIRM');
        break;

      default:
        switch (this.target) {
          case 'all':
            this.msgToShow = this.translate.instant('DELETE_ALL_CONFIRM', {
              type: this.type,
            });
            break;

          default:
            this.msgToShow = this.translate.instant('DELETE_SINGLE_CONFIRM', {
              type: this.type,
            });
            break;
        }
        break;
    }
  }
}
