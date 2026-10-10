import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Customer } from '../models/customer';
import { JobService } from './job.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private jobService = inject(JobService);
  private http = inject(HttpClient);
  customers: Customer[] = [];

  async load(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ customers: Customer[] }>(
        `${environment.apiUrl}/customers`,
      ),
    );
    this.customers = res.customers || [];
  }

  clearLocal() {
    this.customers = [];
  }

  async add(customer: Customer): Promise<Customer> {
    const res = await firstValueFrom(
      this.http.post<{ customer: Customer }>(
        `${environment.apiUrl}/customers`,
        customer,
      ),
    );
    this.customers = [...(this.customers || []), res.customer];
    return res.customer;
  }

  all(): Customer[] {
    return this.customers ? [...this.customers] : [];
  }

  async remove(customer: Customer): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/customers/${customer.id}`),
    );
    this.customers = (this.customers || []).filter((o) => o.id !== customer.id);
  }

  async reset(): Promise<void> {
    await firstValueFrom(this.http.delete(`${environment.apiUrl}/customers`));
    this.customers = [];
  }

  async update(updated: Customer): Promise<Customer> {
    const res = await firstValueFrom(
      this.http.put<{ customer: Customer }>(
        `${environment.apiUrl}/customers/${updated.id}`,
        updated,
      ),
    );
    this.customers = (this.customers || []).map((customer) =>
      customer.id === updated.id ? res.customer : customer,
    );
    this.jobService.updateCustomer(res.customer);
    return res.customer;
  }
}
