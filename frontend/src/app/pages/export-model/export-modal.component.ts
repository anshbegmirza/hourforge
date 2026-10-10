import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonSelect,
  IonSelectOption,
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonFooter,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { Employee } from 'src/app/models/employee';

@Component({
  selector: 'app-export-modal',
  templateUrl: './export-modal.component.html',
  styleUrls: ['./export-modal.component.scss'],
  standalone: true,
  imports: [
    IonFooter,
    IonSelect,
    IonSelectOption,
    IonItem,
    IonContent,
    IonIcon,
    IonButton,
    IonButtons,
    IonTitle,
    IonToolbar,
    IonHeader,
    FormsModule,
    TranslatePipe,
  ],
})
export class ExportModalComponent {
  private modalCtrl = inject(ModalController);

  exportFormat: string = 'pdf';
  selectedEmployeeId: string = '';

  @Input() employeesList: Employee[] = [];
  @Input() isListView: boolean = false;

  constructor() {
    addIcons({ closeOutline });
  }

  closeModal() {
    this.modalCtrl.dismiss();
  }

  confirmExport() {
    this.modalCtrl.dismiss({
      format: this.exportFormat,
      id: this.selectedEmployeeId,
    });
  }
}
