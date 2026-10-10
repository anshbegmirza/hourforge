import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  Input,
  ViewChild,
} from '@angular/core';
import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import SignaturePad from 'signature_pad';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-sign-model',
  templateUrl: './sign-model.component.html',
  styleUrls: ['./sign-model.component.scss'],
  imports: [
    IonContent,
    IonIcon,
    IonButton,
    IonButtons,
    IonTitle,
    IonToolbar,
    IonHeader,
    CommonModule,
    TranslatePipe,
  ],
})
export class SignModelComponent implements AfterViewInit {
  private modalCtrl = inject(ModalController);
  private utilsService = inject(UtilsService);

  @Input() public type: 'EMPLOYER' | 'EMPLOYEES' = 'EMPLOYEES';
  @Input() public sign: string = '';

  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;
  protected signaturePad?: SignaturePad;
  isCleared = false;
  constructor() {
    addIcons({ closeOutline });
  }

  ngAfterViewInit(): void {
    const canvas = this.signatureCanvas?.nativeElement;
    this.signaturePad = new SignaturePad(canvas, {
      backgroundColor: '#ffffff',
      penColor: '#000000',
    });

    this.signaturePad.addEventListener('beginStroke', () => {
      this.isCleared = false;
    });

    setTimeout(() => {
      this.resizeCanvas();
    }, 100);
  }
  closeModal() {
    this.modalCtrl.dismiss();
  }

  resizeCanvas(): void {
    if (this.signatureCanvas) {
      const canvas = this.signatureCanvas.nativeElement;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
      this.signaturePad?.clear();

      if (this.sign) {
        this.signaturePad?.fromDataURL(this.sign);
      }
    }
  }

  async removeSign() {
    const type = await this.utilsService.translate(this.type);
    const confirmed = await this.utilsService.confirm(
      'LBL_CONFIRM',
      'DELETE_SIGNATURE',
      { type },
      'LBL_NO',
      'LBL_YES',
    );
    if (confirmed) {
      this.sign = '';
      this.signaturePad?.clear();
      this.isCleared = true;
    }
  }

  sendData() {
    if (!this.signaturePad?.isEmpty()) {
      this.sign = this.signaturePad?.toDataURL() || '';

      this.modalCtrl.dismiss({ type: this.type, sign: this.sign });
    }
  }
}
