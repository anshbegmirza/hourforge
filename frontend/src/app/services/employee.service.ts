import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Employee } from '../models/employee';
import { JobService } from './job.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private jobService = inject(JobService);
  private http = inject(HttpClient);
  employees: Employee[] = [];

  async load(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ employees: Employee[] }>(
        `${environment.apiUrl}/employees`,
      ),
    );
    this.employees = res.employees || [];
  }

  clearLocal() {
    this.employees = [];
  }

  async add(employee: Employee): Promise<Employee> {
    const res = await firstValueFrom(
      this.http.post<{ employee: Employee }>(
        `${environment.apiUrl}/employees`,
        { name: employee.name },
      ),
    );
    this.employees = [...(this.employees || []), res.employee];
    return res.employee;
  }

  all(): Employee[] {
    return this.employees ? [...this.employees] : [];
  }

  async remove(employee: Employee): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/employees/${employee.id}`),
    );
    this.employees = (this.employees || []).filter((o) => o.id !== employee.id);
  }

  async reset(): Promise<void> {
    await firstValueFrom(this.http.delete(`${environment.apiUrl}/employees`));
    this.employees = [];
  }

  generateUniqueId(): string {
    return 'employee-' + Date.now();
  }

  async update(updated: Employee): Promise<Employee> {
    const res = await firstValueFrom(
      this.http.put<{ employee: Employee }>(
        `${environment.apiUrl}/employees/${updated.id}`,
        { name: updated.name },
      ),
    );
    this.employees = (this.employees || []).map((emp) =>
      emp.id === updated.id ? res.employee : emp,
    );
    this.jobService.updateEmployee(res.employee);
    return res.employee;
  }
}
