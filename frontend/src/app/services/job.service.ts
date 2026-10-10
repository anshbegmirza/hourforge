import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Job } from '../models/job';
import { Employee } from '../models/employee';
import { Customer } from '../models/customer';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class JobService {
  private http = inject(HttpClient);
  jobs: Job[] = [];

  async load(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ jobs: Job[] }>(`${environment.apiUrl}/jobs`),
    );
    this.jobs = res.jobs || [];
  }

  clearLocal() {
    this.jobs = [];
  }

  all(): Job[] {
    return this.jobs || [];
  }

  get(jobId: string): Job | undefined {
    return this.jobs?.find((job) => job?.id == jobId);
  }

  async add(newJob: Job): Promise<Job> {
    const res = await firstValueFrom(
      this.http.post<{ job: Job }>(`${environment.apiUrl}/jobs`, newJob),
    );
    this.jobs = [...(this.jobs || []), res.job];
    return res.job;
  }

  async edit(jobId: string, updatedJob: Job): Promise<Job> {
    const res = await firstValueFrom(
      this.http.put<{ job: Job }>(
        `${environment.apiUrl}/jobs/${jobId}`,
        updatedJob,
      ),
    );
    this.jobs = (this.jobs || []).map((job) =>
      job.id === jobId ? res.job : job,
    );
    return res.job;
  }

  async remove(jobId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiUrl}/jobs/${jobId}`),
    );
    this.jobs = (this.jobs || []).filter((job) => job?.id !== jobId);
  }

  updateEmployee(updatedEmployee: Employee) {
    if (!this.jobs) return;
    for (const job of this.jobs) {
      for (const entry of job.entries || []) {
        if (entry?.employee?.id === updatedEmployee?.id) {
          entry.employee = updatedEmployee;
        }
      }
    }
  }

  updateCustomer(updatedCustomer: Customer) {
    if (!this.jobs) return;
    for (const job of this.jobs) {
      if (job?.customer?.id === updatedCustomer?.id) {
        job.customer = updatedCustomer;
      }
    }
  }

  async reset(): Promise<void> {
    await firstValueFrom(this.http.delete(`${environment.apiUrl}/jobs`));
    this.jobs = [];
  }
}
