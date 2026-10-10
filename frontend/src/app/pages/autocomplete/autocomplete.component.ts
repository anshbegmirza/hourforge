import { UtilsService } from './../../services/utils.service';
import {
  Component,
  forwardRef,
  Input,
  OnInit,
  OnDestroy,
  inject,
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

  searchControl = new FormControl('');
  items: (Customer | Employee)[] = [];
  filteredItems: (Customer | Employee)[] = [];
  showDropdown = false;
  selectedItem: Customer | Employee | null = null;
  showAddOption = false;
  addButtonText = '';
  itemDisplayText: { [id: string]: string } = {};

  private destroy$ = new Subject<void>();
  private onChange = (value: any) => {};
  private onTouched = () => {};

  ngOnInit() {
    this.loadItems();
    this.setupAutocomplete();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        this.filterItems(searchTerm || '');
        this.validateSelection(searchTerm || '');
        this.updateAddOption(searchTerm || '');
      });
  }

  private filterItems(searchTerm: string) {
    if (!searchTerm.trim()) {
      this.filteredItems = [...this.items];
      this.updateDisplayTexts();
      return;
    }

    const term = searchTerm.toLowerCase();

    if (this.type === 'customer') {
      this.filteredItems = this.items.filter((item) => {
        const customer = item as Customer;
        return (
          customer.companyName.toLowerCase().includes(term) ||
          customer.street.toLowerCase().includes(term) ||
          customer.city.toLowerCase().includes(term)
        );
      });
    } else {
      this.filteredItems = this.items.filter((item) => {
        const employee = item as Employee;
        return employee.name.toLowerCase().includes(term);
      });
    }

    this.updateDisplayTexts();
  }

  private validateSelection(searchTerm: string) {
    if (!this.selectedItem) return;

    const expectedText = this.getItemDisplayText(this.selectedItem);
    if (searchTerm !== expectedText) {
      this.selectedItem = null;
      this.onChange('');
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
    } else {
      const employee = item as Employee;
      return employee.name;
    }
  }

  onFocus() {
    this.showDropdown = true;
    this.loadItems();
  }

  onBlur() {
    setTimeout(() => {
      this.showDropdown = false;
    }, 150);
    this.onTouched();
  }

  selectItem(item: Customer | Employee) {
    this.selectedItem = item;
    this.searchControl.setValue(this.getItemDisplayText(item));
    this.showDropdown = false;
    this.onChange(item);
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
      this.searchControl.setValue(this.getItemDisplayText(item));
    } else {
      this.selectedItem = null;
      this.searchControl.setValue('');
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
      this.searchControl.disable();
    } else {
      this.searchControl.enable();
    }
  }
}
