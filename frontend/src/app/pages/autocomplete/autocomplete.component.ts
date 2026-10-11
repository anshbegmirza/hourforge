import { UtilsService } from './../../services/utils.service';
import {
  Component,
  forwardRef,
  Input,
  OnInit,
  OnDestroy,
  inject,
  HostListener,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormControl,
} from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Customer } from 'src/app/models/customer';
import { Employee } from 'src/app/models/employee';
import { CustomerService } from 'src/app/services/customer.service';
import { EmployeeService } from 'src/app/services/employee.service';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonInput,
  IonItem,
  IonList,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [
    IonLabel,
    IonIcon,
    IonInput,
    IonList,
    IonItem,
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './autocomplete.component.html',
  styleUrls: ['./autocomplete.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AutocompleteComponent),
      multi: true,
    },
  ],
})
export class AutocompleteComponent
  implements ControlValueAccessor, OnInit, OnDestroy
{
  @Input() type: 'customer' | 'employee' = 'customer';

  private customerService = inject(CustomerService);
  private employeeService = inject(EmployeeService);
  private utilsService = inject(UtilsService);
  private host = inject(ElementRef<HTMLElement>);
  private cdr = inject(ChangeDetectorRef);

  searchControl = new FormControl('');
  items: (Customer | Employee)[] = [];
  filteredItems: (Customer | Employee)[] = [];
  showDropdown = false;
  selectedItem: Customer | Employee | null = null;
  showAddOption = false;
  addButtonText = '';
  itemDisplayText: { [id: string]: string } = {};
  dropdownStyle: Record<string, string> = {};

  private destroy$ = new Subject<void>();
  private blurTimer: ReturnType<typeof setTimeout> | null = null;
  private onChange = (_value: any) => {};
  private onTouched = () => {};

  ngOnInit() {
    this.loadItems();
    this.setupAutocomplete();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.blurTimer) clearTimeout(this.blurTimer);
  }

  /** Native focus reaches here even when ionFocus does not. */
  @HostListener('focusin')
  onFocusIn() {
    this.openDropdown();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange() {
    if (this.showDropdown) this.positionDropdown();
  }

  private loadItems() {
    if (this.type === 'customer') {
      this.items = this.customerService.all().reverse();
    } else {
      this.items = this.employeeService.all().reverse();
    }

    this.filteredItems = [...this.items];
    this.updateDisplayTexts();
  }

  private updateDisplayTexts() {
    this.itemDisplayText = {};
    this.filteredItems.forEach((item) => {
      if (this.type === 'customer') {
        const customer = item as Customer;
        this.itemDisplayText[item.id] =
          `${customer.companyName}, ${customer.street} ${customer.houseNumber}, ${customer.postalCode} ${customer.city}`;
      } else {
        const employee = item as Employee;
        this.itemDisplayText[item.id] = employee.name;
      }
    });
  }

  private setupAutocomplete() {
    this.searchControl.valueChanges
      .pipe(debounceTime(150), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        const term = searchTerm || '';
        this.validateSelection(term);
        this.openDropdown(term);
        this.updateAddOption(term);
      });
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private filterItems(searchTerm: string) {
    const term = this.normalize(searchTerm.trim());

    if (
      !term ||
      (this.selectedItem &&
        term === this.normalize(this.getItemDisplayText(this.selectedItem)))
    ) {
      this.filteredItems = [...this.items];
      this.updateDisplayTexts();
      return;
    }

    this.filteredItems = this.items.filter((item) =>
      this.normalize(this.getItemDisplayText(item)).includes(term),
    );

    this.updateDisplayTexts();
  }

  private validateSelection(searchTerm: string) {
    if (!this.selectedItem) return;

    const expectedText = this.getItemDisplayText(this.selectedItem);
    if (searchTerm !== expectedText) {
      this.selectedItem = null;
      this.onChange(null);
    }
  }

  private async updateAddOption(searchTerm: string) {
    const trimmedTerm = searchTerm.trim();

    if (this.type === 'employee' && trimmedTerm.length > 0) {
      this.showAddOption = !this.items.some((item) => {
        const employee = item as Employee;
        return employee.name.toLowerCase() === trimmedTerm.toLowerCase();
      });

      this.addButtonText =
        trimmedTerm +
        ' ' +
        (await this.utilsService.translate('ADD_EMPLOYEE_LBL'));
    } else {
      this.showAddOption = false;
    }
  }

  private getItemDisplayText(item: Customer | Employee): string {
    if (this.type === 'customer') {
      const customer = item as Customer;
      return `${customer.companyName}, ${customer.street} ${customer.houseNumber}, ${customer.postalCode} ${customer.city}`;
    }
    return (item as Employee).name;
  }

  openDropdown(searchTerm?: string) {
    if (this.blurTimer) {
      clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
    this.showDropdown = true;
    this.loadItems();
    this.filterItems(searchTerm ?? this.searchControl.value ?? '');
    requestAnimationFrame(() => this.positionDropdown());
    this.cdr.detectChanges();
  }

  private positionDropdown() {
    const anchor =
      this.host.nativeElement.querySelector('ion-item.search-input') ||
      this.host.nativeElement;
    const rect = anchor.getBoundingClientRect();
    this.dropdownStyle = {
      position: 'fixed',
      top: `${Math.round(rect.bottom + 4)}px`,
      left: `${Math.round(rect.left)}px`,
      width: `${Math.round(rect.width)}px`,
      zIndex: '10000',
    };
    this.cdr.markForCheck();
  }

  onFocus() {
    this.openDropdown();
  }

  onIonInput(event: CustomEvent) {
    const value = String((event as CustomEvent<{ value: string }>).detail?.value ?? '');
    this.validateSelection(value);
    this.openDropdown(value);
    void this.updateAddOption(value);
  }

  onBlur() {
    this.blurTimer = setTimeout(() => {
      this.showDropdown = false;
      this.cdr.markForCheck();
    }, 200);
    this.onTouched();
  }

  /** mousedown fires before blur, so selection sticks */
  selectItem(item: Customer | Employee) {
    if (this.blurTimer) {
      clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
    this.selectedItem = item;
    this.searchControl.setValue(this.getItemDisplayText(item), {
      emitEvent: false,
    });
    this.showDropdown = false;
    this.onChange(item);
    this.cdr.markForCheck();
  }

  async addNewEmployee() {
    const newName = this.searchControl.value?.trim();
    if (!newName || this.type !== 'employee') return;

    const created = await this.employeeService.add({
      id: '',
      name: newName,
    });
    this.loadItems();
    this.selectItem(created);
  }

  writeValue(value: Customer | Employee | null): void {
    if (value) {
      const item = this.items.find((i) => i.id === value.id) || value;
      this.selectedItem = item;
      this.searchControl.setValue(this.getItemDisplayText(item), {
        emitEvent: false,
      });
    } else {
      this.selectedItem = null;
      this.searchControl.setValue('', { emitEvent: false });
    }
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.searchControl.disable({ emitEvent: false });
    } else {
      this.searchControl.enable({ emitEvent: false });
    }
  }
}
