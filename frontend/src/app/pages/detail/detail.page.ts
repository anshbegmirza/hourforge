import { TranslatePipe } from '@ngx-translate/core';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { JobService } from 'src/app/services/job.service';
import { Job, JobEntry } from 'src/app/models/job';
import { addIcons } from 'ionicons';
import {
  add,
  calendarOutline,
  settingsOutline,
  shareOutline,
  trashOutline,
  openOutline,
  addCircle,
  chevronBackOutline,
} from 'ionicons/icons';
import { CustomerService } from 'src/app/services/customer.service';
import {
  NavController,
  ModalController,
  IonButtons,
  IonHeader,
  IonBackButton,
  IonToolbar,
  IonTitle,
  IonIcon,
  IonTextarea,
  IonContent,
  IonButton,
  IonLabel,
  IonItem,
  IonInput,
  IonModal,
  IonDatetime,
  IonDatetimeButton,
  IonFooter,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { AddModelComponent } from '../add-model/add-model.component';
import { ExportModalComponent } from '../export-model/export-modal.component';
import { AutocompleteComponent } from '../autocomplete/autocomplete.component';
import * as XLSX from 'xlsx-with-styles-plus';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { UtilsService } from 'src/app/services/utils.service';
import { EmployeeService } from 'src/app/services/employee.service';
import { SignModelComponent } from '../sign-model/sign-model.component';
import {
  EXPORT_BRAND,
  EXPORT_LOGO,
  formatExportDate,
  formatExportDuration,
  formatExportPause,
  formatExportTime,
} from 'src/app/utils/export-format';

pdfMake.vfs = pdfFonts as any;

@Component({
  selector: 'app-detail',
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonFooter,
    IonDatetime,
    IonDatetimeButton,
    IonModal,
    IonItem,
    IonLabel,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonTitle,
    IonToolbar,
    IonBackButton,
    IonHeader,
    IonButtons,
    IonTextarea,
    CommonModule,
    FormsModule,
    RouterModule,
    AutocompleteComponent,
    TranslatePipe,
    IonSegment,
    IonSegmentButton,
  ],
})
export class DetailPage implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  public modalCtrl = inject(ModalController);
  private jobService = inject(JobService);
  private utilsService = inject(UtilsService);
  private customerService = inject(CustomerService);
  private employeeService = inject(EmployeeService);
  private fb = inject(FormBuilder);

  public logoBase64: string = '';
  public minDate = '2000-01-01';
  public maxDate = '';

  jobId?: string;
  job?: Job;

  isEditMode = false;
  jobForm?: FormGroup;

  recordType: 'timesheet' | 'performance' = 'timesheet';

  constructor() {
    addIcons({
      add,
      addCircle,
      shareOutline,
      calendarOutline,
      trashOutline,
      settingsOutline,
      openOutline,
      chevronBackOutline,
    });
  }

  ngOnInit() {
    const maxYear = 2099;
    this.maxDate = new Date(maxYear, 11, 31).toISOString().split('T')[0];
    this.createForm();
    this.calculateTotalTime();
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.job = this.jobService.get(id);
      if (this.job) {
        this.jobId = id;
        for (let i = 0; i < this.job.entries.length - 1; i++) {
          this.addEmployee();
        }
        this.jobForm!.patchValue(this.job);
      } else {
        this.utilsService.showToast('JOB_NOT_FOUND');
        this.navCtrl.back();
      }
    }
    this.entries.controls.forEach((entry) => {
      entry.get('date')?.valueChanges.subscribe((date) => {
        this.calculateSurcharge(entry, date);
      });
    });
    this.jobForm!.get('hourlyRate')?.valueChanges.subscribe(() => {
      this.entries.controls.forEach((entry) => this.calculateSurcharge(entry));
    });
    this.jobForm!.get('nightShiftTime')?.valueChanges.subscribe(() => {
      this.entries.controls.forEach((entry) => {
        this.updateEmployeeDuration(entry as FormGroup);
        this.calculateSurcharge(entry);
      });
    });
    this.calculateTotalTime();
    this.toBase64(EXPORT_LOGO);
  }

  createForm() {
    const employeeForm = this.createEmployeeFormGroup();
    this.updateEmployeeDuration(employeeForm);

    this.jobForm = this.fb.group({
      user: [''],
      customer: [null, [Validators.required]],
      nightShiftTime: [
        this.getCurrentLocalString(22, 0),
        [Validators.required],
      ],
      invoiceNumber: [null, [Validators.required, Validators.min(0)]],
      hourlyRate: [null, [Validators.required, Validators.min(0)]],
      comment: [''],
      entries: this.fb.array([employeeForm]),
      totalTime: ['0:00'],
      employeeDate: [this.getCurrentLocalString()],
      employeeSignature: [''],
      employerDate: [this.getCurrentLocalString()],
      employerSignature: [''],
    });
  }

  get entries(): FormArray {
    return this.jobForm!.get('entries') as FormArray;
  }

  getCurrentLocalString(hours: number = 0, minutes: number = 0): string {
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISO = new Date(d.getTime() - tzOffset)
      .toISOString()
      .slice(0, 16);
    return localISO;
  }

  resetSelection(
    fieldName: string,
    form: AbstractControl | FormGroup | undefined = this.jobForm,
  ) {
    const control = form?.get(fieldName);
    const value = control?.value;
    control?.setValue(undefined, { emitEvent: false });
    control?.setValue(value, { emitEvent: false });
  }

  private createEmployeeFormGroup(
    index?: number,
    parentArray?: FormArray,
  ): FormGroup {
    const employees = this.employeeService.all();

    let latestEmp = null;
    if (parentArray && index !== undefined) {
      if (index > 0) {
        latestEmp = parentArray.at(index - 1).get('employee')?.value;
      } else {
        latestEmp = employees?.[0] ?? null;
      }
    } else {
      latestEmp = employees?.[employees?.length - 1] ?? null;
    }

    const employeeGroup = this.fb.group(
      {
        employee: [latestEmp, [Validators.required]],
        date: [this.getCurrentLocalString(), [Validators.required]],
        start: [this.getCurrentLocalString(8, 0), [Validators.required]],
        end: [this.getCurrentLocalString(17, 0), [Validators.required]],
        pause: ['1970-01-01T00:00:00', [Validators.required]],
        duration: ['0:00 Std.'],
        workHours: [0],
        nightHours: [0],
        amount: [0],
        surchargeNote: [''],
      },
      { validators: this.timeValidator.bind(this) },
    );

    employeeGroup.valueChanges.subscribe(() => {
      this.updateEmployeeDuration(employeeGroup);
      this.calculateSurcharge(employeeGroup);
      this.calculateTotalTime();
    });

    return employeeGroup;
  }

  addEmployee(): void {
    const index = this.entries.length;
    const employeeForm = this.createEmployeeFormGroup(index, this.entries);
    this.updateEmployeeDuration(employeeForm);
    this.entries.push(employeeForm);
    this.calculateSurcharge(employeeForm);
    this.calculateTotalTime();
  }

  removeEmployee(index: number): void {
    if (this.entries.length > 0) {
      this.entries.removeAt(index);
      this.calculateTotalTime();
    }
  }

  private updateEmployeeDuration(employeeGroup: FormGroup): void {
    const { start, end, pause } = employeeGroup.getRawValue();
    if (!start || !end || !pause) return;

    const { netWorkHours, nightHours } = this.calculateShiftDuration(
      new Date(start),
      new Date(end),
      new Date(pause),
    );

    employeeGroup.get('nightHours')?.setValue(nightHours, { emitEvent: false });

    const durationControl = employeeGroup.get('duration');
    const workHoursControl = employeeGroup.get('workHours');
    if (netWorkHours <= 0) {
      durationControl?.setValue('0:00 Std.', { emitEvent: false });
      workHoursControl?.setValue(0, { emitEvent: false });
      return;
    }

    const hours = Math.floor(netWorkHours);
    const minutes = Math.round((netWorkHours - hours) * 60);

    const duration = `${hours}:${String(minutes).padStart(2, '0')} Std.`;
    durationControl?.setValue(duration, { emitEvent: false });
    workHoursControl?.setValue(netWorkHours, { emitEvent: false });
  }

  onHourlyRateInput(event: any) {
    const value = event.target.value;
    if (value < 0) {
      event.target.value = 0;
      this.jobForm?.get('hourlyRate')?.setValue(0);
      this.jobForm?.get('hourlyRate')?.markAllAsTouched;
      this.jobForm?.get('hourlyRate')?.markAsDirty;
    }
  }

  private calculateShiftDuration(start: Date, end: Date, pause: Date) {
    if (end.getTime() <= start.getTime()) {
      end.setDate(end.getDate() + 1);
    }

    const shiftStart = start.getTime();
    const shiftEnd = end.getTime();
    const shiftDuration = Math.max(0, shiftEnd - shiftStart);

    const pauseTime = (pause.getHours() * 60 + pause.getMinutes()) * 60000;

    const netWorkDuration = Math.max(0, shiftDuration - pauseTime);
    const netWorkHours = netWorkDuration / 3600000;

    const nightWindow = (date: Date) => {
      const nightShiftStartTime = this.jobForm?.get('nightShiftTime')?.value;

      let hour = 22;
      let minute = 0;

      if (nightShiftStartTime) {
        const nightShiftStart = new Date(nightShiftStartTime);
        hour = nightShiftStart.getHours();
        minute = nightShiftStart.getMinutes();
      }

      const ns = new Date(date);
      ns.setHours(hour, minute, 0, 0);

      const ne = new Date(ns);
      ne.setHours(6, 0, 0, 0);

      if (ne <= ns) ne.setDate(ne.getDate() + 1);

      return [ns.getTime(), ne.getTime()];
    };

    const [ns1, ne1] = nightWindow(start);
    const prevDay = new Date(start);
    prevDay.setDate(prevDay.getDate() - 1);
    const [ns2, ne2] = nightWindow(prevDay);

    const overlapDuration = (
      a1: number,
      a2: number,
      b1: number,
      b2: number,
    ) => {
      const start = Math.max(a1, b1);
      const endT = Math.min(a2, b2);
      return endT > start ? endT - start : 0;
    };

    const nightTime =
      overlapDuration(shiftStart, shiftEnd, ns1, ne1) +
      overlapDuration(shiftStart, shiftEnd, ns2, ne2);

    const nightHours = nightTime / 3600000;

    return {
      netWorkHours,
      nightHours,
      shiftDuration,
    };
  }

  private calculateTotalTime(): void {
    let totalHours = 0;

    this.entries.controls.forEach((entry) => {
      const workHours = (entry as FormGroup).get('workHours')?.value;
      if (workHours) totalHours += workHours;
    });
    const totalTime = `${Math.floor(totalHours)}:${Math.round(
      (totalHours % 1) * 60,
    )
      .toString()
      .padStart(2, '0')}`;

    this.jobForm!.get('totalTime')?.setValue(totalTime, { emitEvent: false });
  }

  private async calculateSurcharge(
    employeeGroup: AbstractControl,
    date?: string,
  ) {
    const hourlyRate = this.jobForm!.get('hourlyRate')?.value;
    const workHours = employeeGroup.get('workHours')?.value;
    const nightHours = employeeGroup.get('nightHours')?.value || 0;
    const overtimeHours = Math.max(0, workHours - 8);
    const dayOfWeek = new Date(
      date || employeeGroup.get('date')?.value,
    ).getDay();

    const notes: string[] = [];

    let weekendBonus = 0;
    if (dayOfWeek === 6) {
      weekendBonus = 0.25;
      notes.push(await this.utilsService.translate('SATURDAY'));
    }

    if (dayOfWeek === 0) {
      weekendBonus = 0.5;
      notes.push(await this.utilsService.translate('SUNDAY'));
    }

    const nightShiftBonus = 0.5;
    if (nightHours > 0) {
      notes.push(await this.utilsService.translate('NIGHTSHIFT'));
    }

    const overtimeBonus = 0.25;
    if (overtimeHours > 0) {
      notes.push(await this.utilsService.translate('OVERTIME'));
    }

    const surchargeNoteControl = employeeGroup.get('surchargeNote');
    let surchargeNote = '';
    if (notes.length > 0) {
      const noteTemplate = await this.utilsService.translate('NOTE');
      surchargeNote = `*${noteTemplate} (${notes.join(', ')}).`;
    }
    surchargeNoteControl?.setValue(surchargeNote, { emitEvent: false });

    if (!hourlyRate || hourlyRate <= 0) {
      employeeGroup?.get('amount')?.setValue(0, { emitEvent: false });
      return;
    }
    const basePay = workHours * hourlyRate;
    const weekendSurcharge = workHours * hourlyRate * weekendBonus;
    const nightSurcharge = nightHours * hourlyRate * nightShiftBonus;
    const overtimeSurcharge = overtimeHours * hourlyRate * overtimeBonus;

    const amount =
      basePay + weekendSurcharge + nightSurcharge + overtimeSurcharge;
    employeeGroup
      ?.get('amount')
      ?.setValue(Math.round(amount * 100) / 100, { emitEvent: false });
  }

  getFormatedDate(date: string) {
    return new Date(date)?.toLocaleDateString('default', {
      year: 'numeric',
      month: 'long',
      day: '2-digit',
    });
  }

  async onSubmit() {
    if (this.jobForm && this.jobForm.valid) {
      const allJobs = this.jobService.all();

      if (this.isEditMode && this.jobId) {
        const updatedJob = {
          ...this.job,
          ...this.jobForm.value,
        };
        await this.jobService.edit(this.jobId, updatedJob);
      } else {
        const newJob = {
          id: '',
          jobNumber:
            allJobs.length > 0
              ? Math.max(...allJobs.map((job) => job.jobNumber || 0)) + 1
              : 1,
          ...this.jobForm.value,
        };
        await this.jobService.add(newJob);
      }
      await this.showJobToast();
      this.navCtrl.back();
    }
  }

  async showJobToast() {
    const translationKey = this.isEditMode
      ? 'JOB_UPDATED_SUCCESS'
      : 'JOB_ADDED_SUCCESS';
    const msg = await this.utilsService.translate(translationKey);

    this.utilsService.showToast(msg);
  }

  timeValidator(control: AbstractControl): ValidationErrors | null {
    const start = control?.get('start')?.value;
    const end = control?.get('end')?.value;
    const pause = control?.get('pause')?.value;

    if (!start || !end || !pause) return null;

    const { netWorkHours, shiftDuration } = this.calculateShiftDuration(
      new Date(start),
      new Date(end),
      new Date(pause),
    );

    return netWorkHours > 0 && shiftDuration > 0 ? null : { timeInvalid: true };
  }

  async openAddModel() {
    const modal = await this.modalCtrl.create({
      component: AddModelComponent,
      componentProps: { isEmployee: false },
      backdropDismiss: true,
      breakpoints: [0, 0.3, 0.5, 1],
      cssClass: ['addModal'],
    });

    modal.onDidDismiss().then(async (result) => {
      if (result.data) {
        if (result.data.type === 'customer') {
          const created = await this.customerService.add(result.data.data);
          this.jobForm!.patchValue({
            customer: created,
          });
        }
      }
    });

    await modal.present();
  }

  async openSignModel(type: 'EMPLOYER' | 'EMPLOYEES') {
    const sign =
      type === 'EMPLOYEES'
        ? this.jobForm?.value?.employeeSignature
        : this.jobForm?.value?.employerSignature;

    const modal = await this.modalCtrl.create({
      component: SignModelComponent,
      componentProps: { type: type, sign: sign },
      backdropDismiss: true,
      breakpoints: [0, 0.3, 0.5, 1],
      cssClass: ['signModal'],
    });
    modal.onDidDismiss().then((result) => {
      if (result.data && result.data.sign) {
        if (result.data.type === 'EMPLOYEES') {
          this.jobForm!.patchValue({
            employeeSignature: result.data.sign,
          });
        }
        if (result.data.type === 'EMPLOYER') {
          this.jobForm!.patchValue({
            employerSignature: result.data.sign,
          });
        }
      }
    });

    await modal.present();
  }

  async removeSign(type: 'EMPLOYER' | 'EMPLOYEES') {
    const name = await this.utilsService.translate(type);
    const confirmed = await this.utilsService.confirm(
      'LBL_CONFIRM',
      'DELETE_SIGNATURE',
      { type: name },
      'LBL_NO',
      'LBL_YES',
    );
    if (confirmed) {
      if (type === 'EMPLOYEES') {
        this.jobForm!.patchValue({
          employeeSignature: '',
        });
      }
      if (type === 'EMPLOYER') {
        this.jobForm!.patchValue({
          employerSignature: '',
        });
      }
    }
  }

  async toBase64(url: string) {
    const response = await fetch(url);
    const blob = await response.blob();

    this.logoBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async exportJobPDF() {
    const job = this.jobForm!.value;

    if (!this.logoBase64 || this.logoBase64 === '') {
      await this.toBase64(EXPORT_LOGO);
    }

    const logo = this.logoBase64;
    const t = (key: string) => this.utilsService.translateEn(key);

    const employeeHeader = await t('EMPLOYEE');
    const startHeader = await t('START_TIME_PDF');
    const endHeader = await t('END_TIME_PDF');
    const pauseHeader = await t('PAUSE');
    const durationHeader = await t('DURATION');
    const companyLabel = await t('COMPANY');
    const dateLabel = await t('DATE');
    const locationLabel = await t('COMPANY_ADDRESS_PDF');
    const signLabel = await t('SIGNATURE');
    const signature_employee = signLabel + ' ' + (await t('EMPLOYEES'));
    const signature_employeer = signLabel + ' ' + (await t('EMPLOYER'));
    const invoiceNumberLabel = await t('INVOICE_NUMBER');

    const leftTableBody: any[] = [
      [
        { text: employeeHeader, style: 'tableHeader' },
        { text: dateLabel, style: 'tableHeader' },
        { text: startHeader, style: 'tableHeader' },
        { text: endHeader, style: 'tableHeader' },
        { text: pauseHeader, style: 'tableHeader' },
      ],
    ];
    const rightTableBody: any[] = [
      [{ text: durationHeader, style: 'tableHeader' }],
    ];

    let totalMinutes = 0;
    const comments: string[] = [];

    job.entries.forEach((entry: JobEntry) => {
      const pause = formatExportPause(entry.pause);
      const arbeitszeit = formatExportDuration(entry.duration);
      const [dh = 0, dm = 0] = (entry.duration || '0:0')
        .split(':')
        .map((n) => Number.parseInt(n, 10) || 0);
      totalMinutes += dh * 60 + dm;

      leftTableBody.push([
        entry.employee?.name,
        entry.date ? formatExportDate(entry.date) : '',
        formatExportTime(entry.start),
        formatExportTime(entry.end),
        pause,
      ]);
      rightTableBody.push([arbeitszeit]);
    });

    if (job.comment) comments.push(job.comment);

    const totalDuration = formatExportDuration(job.totalTime);
    const { companyName, street, houseNumber, postalCode, city } = job.customer;
    const customerAddress = `${street} ${houseNumber}, ${postalCode} ${city}`;

    const employeeDate = formatExportDate(job.employeeDate);
    const employerDate = formatExportDate(job.employerDate);

    const headerInfoSection = [
      {
        columns: [
          {
            text: companyLabel + ':',
            bold: true,
            width: 84,
            alignment: 'left',
          },
          { text: '', width: 10 },
          {
            stack: [
              { text: `${companyName}, ${customerAddress}`, alignment: 'left' },
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 2,
                    x2: 431,
                    y2: 2,
                    lineWidth: 0.5,
                    lineColor: '#000',
                  },
                ],
              },
            ],
            width: 'auto',
          },
        ],
        margin: [0, 0, 0, 5],
      },

      {
        columns: [
          {
            text: locationLabel + ':',
            bold: true,
            width: 84,
            alignment: 'left',
          },
          { text: '', width: 10 },
          {
            stack: [
              { text: customerAddress, alignment: 'left' },
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 2,
                    x2: 430,
                    y2: 2,
                    lineWidth: 0.5,
                    lineColor: '#000',
                  },
                ],
              },
            ],
            width: '*',
          },
        ],
        margin: [0, 0, 0, 15],
      },
    ];

    if (this.recordType === 'performance') {
      headerInfoSection.push({
        columns: [
          {
            text: invoiceNumberLabel + ':',
            bold: true,
            width: 84,
            alignment: 'left',
          },
          { text: '', width: 10 },
          {
            stack: [
              { text: job.invoiceNumber, alignment: 'left' },
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 2,
                    x2: 430,
                    y2: 2,
                    lineWidth: 0.5,
                    lineColor: '#000',
                  },
                ],
              },
            ],
            width: '*',
          },
        ],
        margin: [0, 0, 0, 15],
      });
    }

    const documentDefinition: any = {
      pageMargins: [40, 40, 40, 40],
      content: [
        { image: logo, width: 180, alignment: 'center', margin: [0, 0, 0, 20] },
        ...headerInfoSection,
        {
          columns: [
            {
              width: '65%',
              table: {
                headerRows: 1,
                widths: [130, 65, 65, 65, 65],
                body: leftTableBody,
              },
              layout: {
                fillColor: (rowIndex: number) =>
                  rowIndex === 0 ? '#D6DCE4' : null,
                hLineColor: () => '#000',
                vLineColor: () => '#000',
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
              },
            },
            { width: 112, text: '' },
            {
              width: 65,
              table: { headerRows: 1, widths: ['*'], body: rightTableBody },
              layout: {
                fillColor: (rowIndex: number) =>
                  rowIndex === 0 ? '#D6DCE4' : null,
                hLineColor: () => '#000',
                vLineColor: () => '#000',
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
              },
            },
          ],
          columnGap: 0,
          margin: [0, 0, 0, 5],
        },
        {
          columns: [
            { width: '65%', text: '' },
            {
              width: 112,
              text: (await this.utilsService.translateEn('TOTAL_TIME')) + ':',
              bold: true,
              alignment: 'right',
              margin: [0, 2, 10, 0],
            },
            {
              width: 65,
              table: {
                widths: ['*'],
                body: [[{ text: totalDuration, bold: true }]],
              },
              layout: {
                hLineColor: () => '#000',
                vLineColor: () => '#000',
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
              },
            },
          ],
          columnGap: 0,
          margin: [0, 0, 0, 20],
        },
        comments.flatMap((c) => [
          {
            text: c,
            style: 'commentText',
            alignment: 'left',
            margin: [0, 0, 0, 2],
          },
          {
            canvas: [
              {
                type: 'line',
                x1: 0,
                y1: 0,
                x2: 520,
                y2: 0,
                lineWidth: 0.5,
                lineColor: '#000000',
              },
            ],
            margin: [0, 0, 0, 5],
          },
        ]),
      ],
      styles: {
        headerInfo: { fontSize: 10, margin: [0, 2, 0, 2] },
        tableHeader: {
          bold: true,
          fontSize: 9,
          color: '#000',
          alignment: 'center',
          fillColor: '#D6DCE4',
        },
        commentTitle: { fontSize: 12, bold: true },
        commentText: { fontSize: 10 },
      },
      defaultStyle: { fontSize: 9, alignment: 'center' },
    };

    if (this.recordType === 'performance') {
      documentDefinition?.content?.push({
        columns: [
          {
            width: '50%',
            stack: [
              {
                text: dateLabel + ': ' + employeeDate,
                alignment: 'left',
                margin: [0, 0, 0, 5],
              },
              job.employeeSignature
                ? {
                    image: job.employeeSignature,
                    height: 50,
                    width: 100,
                    alignment: 'left',
                    margin: [0, 5, 0, 0],
                  }
                : {
                    text: '',
                    alignment: 'left',
                    margin: [0, 20, 0, 34],
                  },
              {
                text: signature_employee,
                alignment: 'left',
                margin: [0, 10, 0, 5],
              },
            ],
          },
          {
            width: '50%',
            margin: [160, 0, 0, 0],
            stack: [
              {
                text: dateLabel + ': ' + employerDate,
                alignment: 'left',
                margin: [0, 0, 0, 5],
              },
              job.employerSignature
                ? {
                    image: job.employerSignature,
                    height: 50,
                    width: 100,
                    alignment: 'left',
                    margin: [0, 5, 0, 0],
                  }
                : {
                    text: '',
                    alignment: 'left',
                    margin: [0, 20, 0, 34],
                  },
              {
                text: signature_employeer,
                alignment: 'left',
                margin: [0, 10, 0, 0],
              },
            ],
          },
        ],
        margin: [0, 40, 0, 0],
      });

      const footerText = await this.utilsService.translateEn(
        'PERFORMANCE_PDF_FOOTER',
      );
      documentDefinition.footer = () => {
        return {
          columns: [
            {
              text: footerText,
              alignment: 'center',
              fontSize: 9,
              margin: [40, 5, 40, 5],
            },
          ],
        };
      };
    }

    pdfMake.createPdf(documentDefinition).download(EXPORT_BRAND);

    const toastMsg = await this.utilsService.translate('PDF_DOWNLOADED');
    this.utilsService.showToast(toastMsg);
  }

  async exportJobExcel() {
    const job = this.jobForm!.value;
    const wb = XLSX.utils.book_new();
    const data: any[][] = [];

    const { companyName, street, houseNumber, postalCode, city } = job.customer;
    const customerAddress = `${street} ${houseNumber}, ${postalCode} ${city}`;

    data.push(['', '', '', '', '', '', '']);
    data.push(['', '', '', '', '', '', '']);
    data.push(['', '', '', '', '', '', '']);

    data.push([
      (await this.utilsService.translateEn('COMPANY')) + ':',
      `${companyName}, ${customerAddress}`,
      '',
      '',
      '',
      '',
      '',
    ]);

    data.push([
      (await this.utilsService.translateEn('COMPANY_ADDRESS_PDF')) + ':',
      customerAddress,
      '',
      '',
      '',
      '',
      '',
    ]);

    data.push(['', '', '', '', '', '', '']);

    data.push([
      await this.utilsService.translateEn('EMPLOYEE'),
      await this.utilsService.translateEn('DATE'),
      await this.utilsService.translateEn('START_TIME_PDF'),
      await this.utilsService.translateEn('END_TIME_PDF'),
      await this.utilsService.translateEn('PAUSE'),
      '',
      await this.utilsService.translateEn('DURATION'),
    ]);

    job.entries.forEach((entry: JobEntry) => {
      data.push([
        entry.employee?.name || '',
        entry.date ? formatExportDate(entry.date) : '',
        formatExportTime(entry.start),
        formatExportTime(entry.end),
        formatExportPause(entry.pause),
        '',
        formatExportDuration(entry.duration),
      ]);
    });

    data.push(['', '', '', '', '', '', '']);

    const totalDuration = formatExportDuration(job.totalTime);
    data.push([
      '',
      '',
      '',
      '',
      '',
      (await this.utilsService.translateEn('TOTAL_TIME')) + ':',
      totalDuration,
    ]);

    data.push(['', '', '', '', '', '', '']);

    if (job.comment) {
      data.push([job.comment, '', '', '', '', '', '']);
    } else {
      data.push(['', '', '', '', '', '', '']);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);

    let maxEmployeeNameLength = 20;
    job.entries.forEach((entry: JobEntry) => {
      if (entry.employee?.name) {
        maxEmployeeNameLength = Math.max(
          maxEmployeeNameLength,
          entry.employee?.name?.length / 1.2,
        );
      }
    });

    const headerStyle = {
      font: { bold: true, sz: 10 },
      fill: { fgColor: { rgb: 'D6DCE4' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
      },
    };

    const dataStyle = {
      font: { sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
      },
    };

    const infoLabelStyle = {
      font: { bold: true, sz: 10 },
      alignment: { horizontal: 'left', vertical: 'center' },
    };

    const infoValueStyle = {
      font: { sz: 10 },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: {
        bottom: { style: 'thin', color: { rgb: '000000' } },
      },
    };

    const totalLabelStyle = {
      font: { bold: true, sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center' },
    };

    const totalValueStyle = {
      font: { bold: true, sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
      },
    };

    const commentStyle = {
      font: { sz: 10 },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
      border: {
        bottom: { style: 'thin', color: { rgb: '000000' } },
      },
    };

    const headerRowIndex = 6;
    const dataStartRow = headerRowIndex + 1;
    const dataEndRow = dataStartRow + job.entries.length - 1;
    const totalRowIndex = dataEndRow + 2;
    const commentValueRow = totalRowIndex + 2;

    for (let row = 2; row <= 4; row++) {
      const cellA = XLSX.utils.encode_cell({ r: row, c: 0 });
      if (ws[cellA]) ws[cellA].s = infoLabelStyle;

      for (let col = 1; col <= 6; col++) {
        const cell = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[cell]) ws[cell].s = infoValueStyle;
      }

      const mergeRange = XLSX.utils.encode_range({
        s: { r: row, c: 1 },
        e: { r: row, c: 6 },
      });
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push(XLSX.utils.decode_range(mergeRange));
    }

    const logoMergeRange = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: 2, c: 6 },
    });
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push(XLSX.utils.decode_range(logoMergeRange));

    for (let col = 0; col < 7; col++) {
      if (col === 5) continue;
      const cell = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
      if (ws[cell]) ws[cell].s = headerStyle;
    }

    for (let row = dataStartRow; row <= dataEndRow; row++) {
      for (let col = 0; col < 7; col++) {
        const cell = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[cell]) {
          if (col === 5) {
            ws[cell].s = {
              font: { sz: 10 },
              alignment: { horizontal: 'center', vertical: 'center' },
            };
          } else {
            ws[cell].s = dataStyle;
          }
        }
      }
    }

    const totalLabelCell = XLSX.utils.encode_cell({ r: totalRowIndex, c: 5 });
    const totalValueCell = XLSX.utils.encode_cell({ r: totalRowIndex, c: 6 });
    if (ws[totalLabelCell]) ws[totalLabelCell].s = totalLabelStyle;
    if (ws[totalValueCell]) ws[totalValueCell].s = totalValueStyle;

    const totalMergeRange = XLSX.utils.encode_range({
      s: { r: totalRowIndex, c: 0 },
      e: { r: totalRowIndex, c: 4 },
    });
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push(XLSX.utils.decode_range(totalMergeRange));

    for (let col = 0; col < 7; col++) {
      const commentValueCell = XLSX.utils.encode_cell({
        r: commentValueRow,
        c: col,
      });
      if (ws[commentValueCell]) ws[commentValueCell].s = commentStyle;
    }

    const commentValueMerge = XLSX.utils.encode_range({
      s: { r: commentValueRow, c: 0 },
      e: { r: commentValueRow, c: 6 },
    });
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push(XLSX.utils.decode_range(commentValueMerge));

    const employeeColWidth = Math.max(maxEmployeeNameLength, 20);
    ws['!cols'] = [
      { wch: employeeColWidth },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 15 },
      { wch: 10 },
    ];

    ws['!rows'] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < 3) {
        ws['!rows'][i] = { hpt: 20 };
      } else if (i >= 3 && i <= 6) {
        const cellB = XLSX.utils.encode_cell({ r: i, c: 1 });
        const value = ws[cellB]?.v ? String(ws[cellB].v) : '';
        const totalWidth = 100;
        const lines = Math.ceil(value.length / totalWidth);
        ws['!rows'][i] = { hpt: 18 + 12 * Math.max(0, lines - 1) };
      } else if (i === commentValueRow) {
        const cellA = XLSX.utils.encode_cell({ r: i, c: 0 });
        const value = ws[cellA]?.v ? String(ws[cellA].v) : '';
        const totalWidth = 80;
        const lines = Math.ceil(value.length / totalWidth);
        ws['!rows'][i] = { hpt: 18 + 12 * Math.max(0, lines - 1) };
      } else {
        ws['!rows'][i] = { hpt: 18 };
      }
    }

    if (!this.logoBase64 || this.logoBase64 === '') {
      await this.toBase64(EXPORT_LOGO);
    }

    const logoDataUrl = this.logoBase64;
    const base64Data =
      typeof logoDataUrl === 'string' && logoDataUrl.indexOf(',') > -1
        ? logoDataUrl.split(',')[1]
        : logoDataUrl;

    (ws as any)['!images'] = [
      {
        name: 'logo.png',
        data: base64Data,
        opts: { base64: true },
        type: 'png',
        position: {
          type: 'twoCellAnchor',
          attrs: { editAs: 'oneCell' },
          from: { col: 2, row: 0 },
          to: { col: 5, row: 2 },
        },
      },
    ];

    XLSX.utils.book_append_sheet(wb, ws);

    const fileName = `${EXPORT_BRAND}.xlsx`;
    XLSX.writeFile(wb, fileName);

    const toastMsg = await this.utilsService.translate('EXCEL_DOWNLOADED');
    this.utilsService.showToast(toastMsg);
  }

  async openExportModal() {
    if (this.jobForm && this.jobForm.invalid) return;

    if (this.recordType === 'performance') {
      return this.exportJobPDF();
    }

    const modal = await this.modalCtrl.create({
      component: ExportModalComponent,
      cssClass: 'exportModel',
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.format) {
      data.format === 'pdf' ? this.exportJobPDF() : this.exportJobExcel();
    }
  }

  async openWarningModel(type: 'job', target?: 'all' | any) {
    const confirmed = await this.utilsService.confirm(
      'LBL_CONFIRM',
      'DELETE_JOB',
      {},
      'LBL_NO',
      'LBL_YES',
    );

    if (confirmed) {
      if (this.jobId) {
        await this.jobService.remove(this.jobId);
        this.utilsService.showToast('JOB_DELETED_SUCCESSFULLY');
      }
      this.navCtrl.back();
    }
  }
}
