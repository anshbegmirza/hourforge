import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonIcon,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonItemGroup,
  IonSearchbar,
} from '@ionic/angular/standalone';
import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  addOutline,
  add,
  settingsOutline,
  addCircle,
  camera,
  download,
  chevronForwardOutline,
  openOutline,
} from 'ionicons/icons';
import { ExportModalComponent } from '../export-model/export-modal.component';
import { EmployeeJobRecord, Job, JobEntry } from 'src/app/models/job';
import { JobService } from 'src/app/services/job.service';
import * as XLSX from 'xlsx-with-styles-plus';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { TranslatePipe } from '@ngx-translate/core';
import { UtilsService } from 'src/app/services/utils.service';
import { Employee } from 'src/app/models/employee';
import {
  EXPORT_BRAND,
  EXPORT_LOGO,
  formatExportDate,
  formatExportDuration,
  formatExportPause,
  formatExportTime,
  formatExportWeekday,
  monthNameToIndex,
  toEnglishMonthLabel,
} from 'src/app/utils/export-format';
import { LanguageService } from 'src/app/services/language.service';
pdfMake.vfs = pdfFonts as any;

@Component({
  selector: 'app-list',
  templateUrl: './list.page.html',
  styleUrls: ['./list.page.scss'],
  standalone: true,
  imports: [
    IonSearchbar,
    IonItemGroup,
    IonButton,
    IonLabel,
    IonItem,
    IonList,
    IonContent,
    IonIcon,
    IonButtons,
    IonTitle,
    IonToolbar,
    IonHeader,
    FormsModule,
    RouterModule,
    KeyValuePipe,
    DatePipe,
    TranslatePipe,
  ],
})
export class ListPage implements OnInit {
  @ViewChild(IonSearchbar, { read: ElementRef })
  private searchbarRef?: ElementRef<HTMLElement>;

  jobService = inject(JobService);
  utilsService = inject(UtilsService);
  private languageService = inject(LanguageService);
  searchQuery = '';
  jobs: Job[] = [];
  jobsByMonth: Record<string, Job[]> = {};
  public modalCtrl = inject(ModalController);
  public logoBase64: string = '';

  get locale(): string {
    return this.languageService.locale;
  }

  constructor() {
    addIcons({
      settingsOutline,
      addOutline,
      add,
      addCircle,
      openOutline,
      chevronForwardOutline,
      download,
      camera,
    });
  }

  ngOnInit() {
    this.toBase64(EXPORT_LOGO);
  }

  async ionViewDidEnter() {
    await this.syncSearchAriaLabel();
    // Ionic paints the shadow input a tick later
    setTimeout(() => void this.syncSearchAriaLabel(), 0);
  }

  private async syncSearchAriaLabel() {
    const label = await this.utilsService.translate('SEARCH_ORDERS');
    const host = this.searchbarRef?.nativeElement as HTMLElement | undefined;
    if (!host) return;
    host.setAttribute('aria-label', label);
    const input =
      host.shadowRoot?.querySelector('input') ||
      host.querySelector('input');
    if (input) {
      input.setAttribute('aria-label', label);
      input.setAttribute('aria-labelledby', '');
    }
  }

  ionViewWillEnter() {
    this.jobs = this.jobService.jobs || [];
    const singleJobs: Job[] = [];

    for (const job of this.jobs) {
      for (const entry of job.entries || []) {
        singleJobs.push({
          ...job,
          entries: [entry],
        });
      }
    }

    this.jobs = singleJobs.sort(
      (a, b) => Date.parse(b.entries[0]?.date) - Date.parse(a.entries[0]?.date),
    );

    const grouped: Record<string, Job[]> = {};

    for (const job of this.jobs) {
      const jobDate = new Date(job.entries[0]?.date);
      const key = jobDate.toLocaleString(this.locale, {
        month: 'long',
        year: 'numeric',
      });

      grouped[key] ??= [];
      grouped[key].push(job);
    }

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const [aMonth, aYear] = a.split(' ');
      const [bMonth, bYear] = b.split(' ');
      const aDate = new Date(
        `${aYear}-${monthNameToIndex(aMonth) + 1}-01`,
      );
      const bDate = new Date(
        `${bYear}-${monthNameToIndex(bMonth) + 1}-01`,
      );

      return bDate.getTime() - aDate.getTime();
    });

    this.jobsByMonth = Object.fromEntries(
      sortedKeys.map((k) => [k, grouped[k]]),
    );

    this.searchQuery = '';
  }

  onSearch() {
    const query = this.searchQuery?.toLowerCase() || '';
    this.jobsByMonth = {};
    this.jobs
      ?.filter(
        (job) =>
          job.customer?.companyName?.toLowerCase().includes(query) ||
          job.entries?.some((entry) =>
            entry.employee?.name?.toLowerCase().includes(query),
          ),
      )
      ?.sort(
        (a, b) =>
          Date.parse(b.entries[0]?.date) - Date.parse(a.entries[0]?.date),
      )
      ?.forEach((job) => {
        const jobDate = new Date(job.entries[0]?.date);
        let key = jobDate?.toLocaleString(this.locale, {
          month: 'long',
          year: 'numeric',
        });
        this.jobsByMonth[key] ??= [];
        this.jobsByMonth[key] = [...this.jobsByMonth[key], job];
      });
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

  async exportMonthPDF(employeeEntries: EmployeeJobRecord[], month: string) {
    const t = (key: string) => this.utilsService.translateEn(key);
    const tableBody: (string | object)[][] = [
      [
        { text: await t('DATE'), style: 'tableHeader' },
        { text: await t('DAY'), style: 'tableHeader' },
        { text: await t('START_TIME_PDF'), style: 'tableHeader' },
        { text: await t('END_TIME_PDF'), style: 'tableHeader' },
        { text: await t('PAUSE'), style: 'tableHeader' },
        { text: await t('WORKING_TIME_PDF'), style: 'tableHeader' },
        { text: (await t('HOURLY_RATE')) + ' €', style: 'tableHeader' },
        { text: (await t('TOTAL_SUMMARY')) + ' €', style: 'tableHeader' },
      ],
    ];

    let totalHours = 0;
    let totalTagessatz = 0;

    employeeEntries.forEach((item) => {
      const [hours = 0, minutes = 0] = (item.entry.duration || '0:0')
        .split(':')
        .map(Number.parseFloat);

      const arbeitszeit = formatExportDuration(item.entry.duration);
      const workingHours = hours + minutes / 60;
      const tagessatz = item.entry.amount;

      totalHours += workingHours;
      totalTagessatz += tagessatz;

      tableBody.push([
        formatExportDate(item.entry.date),
        formatExportWeekday(item.entry.date),
        formatExportTime(item.entry.start),
        formatExportTime(item.entry.end),
        formatExportPause(item.entry.pause),
        arbeitszeit,
        `${(item.hourlyRate || 0)?.toFixed(2)} €`,
        `${tagessatz.toFixed(2)} €`,
      ]);
    });

    tableBody.push([
      {
        text: await t('TOTAL_TIME_TAKEN'),
        colSpan: 1,
        alignment: 'center',
        bold: true,
      },
      {},
      {},
      {},
      {},
      `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`,
      '',
      `${totalTagessatz.toFixed(2)} €`,
    ]);

    if (!this.logoBase64 || this.logoBase64 === '') {
      await this.toBase64(EXPORT_LOGO);
    }

    const logo = this.logoBase64;
    const englishMonth = toEnglishMonthLabel(month);
    const documentDefinition: any = {
      pageMargins: [40, 40, 40, 40],
      content: [
        {
          image: logo,
          width: 180,
          alignment: 'center',
          margin: [0, 0, 0, 10],
        },
        {
          text: `${await t('NAME')}: ${employeeEntries[0]?.entry.employee.name || ''}`,
          margin: [0, 5, 0, 10],
          alignment: 'left',
        },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', '*', '*', '*', '*', '*', '*'],
            body: tableBody,
          },
          layout: {
            fillColor: (rowIndex: number) => {
              if (rowIndex === 0) {
                return '#D6DCE4';
              }
              if (rowIndex === tableBody.length - 1) {
                return '#fdff00';
              }
              return null;
            },
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
          },
          margin: [0, 0, 0, 0],
        },
      ],
      styles: {
        title: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 5],
        },
        subtitle: {
          fontSize: 14,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 10],
        },
        tableHeader: {
          bold: true,
          fontSize: 8,
          color: '#000',
          alignment: 'center',
          fillColor: '#D6DCE4',
        },
      },
      defaultStyle: {
        fontSize: 9,
        alignment: 'center',
      },
    };

    pdfMake.createPdf(documentDefinition).download(`${EXPORT_BRAND} ${englishMonth}`);

    const toastMsg = await this.utilsService.translate('PDF_DOWNLOADED');
    this.utilsService.showToast(toastMsg);
  }

  async exportMonthExcel(jobs: EmployeeJobRecord[], month: string) {
    const t = (key: string) => this.utilsService.translateEn(key);
    const name = jobs.length > 0 ? jobs[0].entry.employee.name : 'Employee';
    const company = EXPORT_BRAND;
    const englishMonth = toEnglishMonthLabel(month);
    const filename = `${EXPORT_BRAND} ${englishMonth}.xlsx`;

    const headers = [
      await t('DATE'),
      await t('DAY'),
      await t('START_TIME_PDF'),
      await t('END_TIME_PDF'),
      await t('PAUSE'),
      await t('WORKING_TIME_PDF'),
      (await t('HOURLY_RATE')) + ' €',
      (await t('TOTAL_SUMMARY')) + ' €',
    ];

    const rows: any[][] = [];

    rows.push(['', '', '', '', '', '']);
    rows.push(['', '', '', '', '', '']);
    rows.push(['', '', '', '', '', '']);
    rows.push([
      '',
      '',
      await t('NAME'),
      name,
      await t('COMPANY'),
      company,
    ]);
    rows.push(['']);
    rows.push(headers);

    let totalHours = 0;
    let totalTagessatz = 0;

    jobs.forEach((job) => {
      const entry = job.entry;
      const [h = 0, m = 0] = (entry.duration || '0:0')
        .split(':')
        .map(Number.parseFloat);
      const workingHours = h + m / 60;
      const tagessatz = entry.amount;

      totalHours += workingHours;
      totalTagessatz += tagessatz;

      rows.push([
        formatExportDate(entry.date),
        formatExportWeekday(entry.date),
        formatExportTime(entry.start),
        formatExportTime(entry.end),
        formatExportPause(entry.pause),
        formatExportDuration(entry.duration),
        (job.hourlyRate || 0)?.toFixed(2) + ' €',
        tagessatz?.toFixed(2) + ' €',
      ]);
    });

    rows.push([
      await t('TOTAL_TIME_TAKEN'),
      '',
      '',
      '',
      '',
      `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`,
      '',
      totalTagessatz.toFixed(2) + ' €',
    ]);

    const ws: any = XLSX.utils.aoa_to_sheet(rows);

    ws['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
    ];

    rows.splice(1, 0, ['', '', '', '', '', '']);
    ws['!rows'] = [];
    ws['!rows'][0] = { hpt: 18 };
    ws['!rows'][1] = { hpt: 40 };
    ws['!rows'][2] = { hpt: 18 };
    ws['!rows'][3] = { hpt: 22 };
    for (let i = 4; i < rows.length; i++) {
      ws['!rows'][i] = { hpt: 18 };
    }
    const center = { horizontal: 'center', vertical: 'center' } as const;
    const thinBorder = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    } as const;

    const range = XLSX.utils.decode_range(ws['!ref']!);

    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) continue;
        cell.s = { ...(cell.s || {}), alignment: center };
      }
    }

    const nameLabelCell = XLSX.utils.encode_cell({ r: 3, c: 2 });
    if (ws[nameLabelCell])
      ws[nameLabelCell].s = {
        ...(ws[nameLabelCell].s || {}),
        font: { sz: 10 },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: { bottom: { style: 'thin', color: { rgb: '000000' } } },
      };
    const nameValueCell = XLSX.utils.encode_cell({ r: 3, c: 3 });
    if (ws[nameValueCell])
      ws[nameValueCell].s = {
        ...(ws[nameValueCell].s || {}),
        font: { sz: 10, bold: true },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: { bottom: { style: 'thin', color: { rgb: '000000' } } },
      };

    const firmaLabelCell = XLSX.utils.encode_cell({ r: 3, c: 4 });
    if (ws[firmaLabelCell])
      ws[firmaLabelCell].s = {
        ...(ws[firmaLabelCell].s || {}),
        font: { sz: 10 },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: { bottom: { style: 'thin', color: { rgb: '000000' } } },
      };
    const firmaValueCell = XLSX.utils.encode_cell({ r: 3, c: 5 });
    if (ws[firmaValueCell])
      ws[firmaValueCell].s = {
        ...(ws[firmaValueCell].s || {}),
        font: { sz: 10, bold: true },
        alignment: center,
        border: { bottom: { style: 'thin', color: { rgb: '000000' } } },
      };

    for (let C = 0; C <= 7; C++) {
      const addr = XLSX.utils.encode_cell({ r: 5, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = {
        font: { bold: true, sz: 10, color: { rgb: '000000' } },
        fill: { fgColor: { rgb: 'D6DCE4' } },
        alignment: center,
        border: thinBorder,
      };
    }

    const lastRow = range.e.r;
    for (let R = 6; R < lastRow; R++) {
      for (let C = 0; C <= 7; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[addr]) continue;
        ws[addr].s = {
          ...(ws[addr].s || {}),
          font: { sz: 10 },
          border: thinBorder,
          alignment: center,
        };
      }
    }

    for (let C = 0; C <= 7; C++) {
      const addr = XLSX.utils.encode_cell({ r: lastRow, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = {
        font: { bold: true, sz: 10 },
        fill: { fgColor: { rgb: 'FFFF00' } },
        alignment: center,
        border: thinBorder,
      };
    }

    const wb: any = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, englishMonth);

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
          from: { col: 3, row: 1 },
          to: { col: 5, row: 2 },
          ext: {
            cx: 200 * 9525,
            cy: 40 * 9525,
          },
        },
      },
    ];

    (ws as any)['!merges'] = [
      ...((ws as any)['!merges'] || []),
      { s: { r: 0, c: 0 }, e: { r: 2, c: 7 } },
    ];

    XLSX.writeFile(wb, filename);

    const toastMsg = await this.utilsService.translate('EXCEL_DOWNLOADED');
    this.utilsService.showToast(toastMsg);
  }

  getEmployeeEntriesByMonth(
    jobs: Job[],
    employeeId: string,
    monthYear: string,
  ) {
    const entries: EmployeeJobRecord[] = [];
    const [monthName, yearStr] = monthYear.split(' ');
    const year = parseInt(yearStr, 10);
    const month = monthNameToIndex(monthName);

    jobs.forEach((job) => {
      job.entries.forEach((entry) => {
        const entryDate = new Date(entry.date);
        if (
          entryDate.getMonth() === month &&
          entryDate.getFullYear() === year &&
          entry.employee.id === employeeId
        ) {
          entries.push({
            jobId: job.id,
            jobDate: entry.date,
            customerName: job.customer.companyName,
            hourlyRate: job.hourlyRate,
            comment: job.comment,
            entry: entry,
          });
        }
      });
    });

    return entries;
  }

  async openExportModal(jobs: Job[], month: string) {
    const employeeList: Employee[] = jobs
      .flatMap((job) => job.entries.map((entry) => entry.employee))
      .filter(
        (emp, index, self) => index === self.findIndex((e) => e.id === emp.id),
      );

    const modal = await this.modalCtrl.create({
      component: ExportModalComponent,
      componentProps: {
        employeesList: employeeList,
        isListView: true,
      },
      cssClass: ['hf-dialog', 'hf-dialog--export', 'hf-dialog--export-tall'],
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.format && data?.id) {
      const employeeEntries = this.getEmployeeEntriesByMonth(
        jobs,
        data.id,
        month,
      );
      if (data.format === 'pdf') {
        this.exportMonthPDF(employeeEntries, month);
      } else {
        this.exportMonthExcel(employeeEntries, month);
      }
    }
  }
}
