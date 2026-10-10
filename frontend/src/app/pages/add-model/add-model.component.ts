import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonLabel,
  IonItem,
  IonInput,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-add-model',
  templateUrl: './add-model.component.html',
  styleUrls: ['./add-model.component.scss'],
  standalone: true,
  imports: [
    IonInput,
    IonItem,
    IonLabel,
    IonContent,
    IonIcon,
    IonButton,
    IonButtons,
    IonTitle,
    IonToolbar,
    IonHeader,
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
  ],
})
export class AddModelComponent implements OnInit {
  private modalCtrl = inject(ModalController);
  private fb = inject(FormBuilder);
  @Input() public isEmployee: boolean = false;
  @Input() public isEditData: any;

  employeeForm?: FormGroup;
  customerForm?: FormGroup;

  constructor() {
    addIcons({ closeOutline });
  }

  ngOnInit() {
    this.initForms();
    if (this.isEditData) {
      this.patchValue();
    }
  }

  private initForms() {
    this.employeeForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(300)]],
    });
    this.customerForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.maxLength(300)]],
      street: ['', [Validators.required, Validators.maxLength(300)]],
      houseNumber: ['', [Validators.required, Validators.maxLength(300)]],
      postalCode: ['', [Validators.required, this.lengthValidator(5)]],
      city: ['', [Validators.required, Validators.maxLength(300)]],
    });
  }

  private lengthValidator(length: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      const regex = new RegExp(`^[0-9]{${length}}$`);
      return regex.test(value)
        ? null
        : { exactLength: { requiredLength: length } };
    };
  }

  private patchValue() {
    if (this.isEditData.id.startsWith('employee-')) {
      this.employeeForm!.patchValue({ name: this.isEditData?.name });
    } else {
      this.customerForm!.patchValue({
        companyName: this.isEditData?.companyName,
        street: this.isEditData?.street,
        houseNumber: this.isEditData?.houseNumber,
        postalCode: this.isEditData?.postalCode,
        city: this.isEditData?.city,
      });
    }
  }
  private generateUniqueId(isEmployee: boolean): string {
    const prefix = isEmployee ? 'employee' : 'customer';
    return `${prefix}-${Date.now()}`;
  }

  closeModal() {
    this.modalCtrl.dismiss();
  }

  sendData() {
    if (this.isEmployee && this.employeeForm!.valid) {
      const formValue = this.employeeForm!.value;
      const id = this.isEditData
        ? this.isEditData?.id
        : this.generateUniqueId(true);
      const employee = { id, ...formValue };
      this.modalCtrl.dismiss({ type: 'employee', data: employee });
    } else if (!this.isEmployee && this.customerForm!.valid) {
      const formValue = this.customerForm!.value;
      const id = this.isEditData
        ? this.isEditData?.id
        : this.generateUniqueId(false);
      const customer = {
        id,
        ...formValue,
      };
      this.modalCtrl.dismiss({ type: 'customer', data: customer });
    } else {
      this.employeeForm!.markAllAsTouched();
      this.customerForm!.markAllAsTouched();
      return;
    }
  }
}
