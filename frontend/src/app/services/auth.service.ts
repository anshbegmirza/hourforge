import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CustomerService } from './customer.service';
import { EmployeeService } from './employee.service';
import { JobService } from './job.service';

export interface AuthUser {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  preferredLang?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private customerService = inject(CustomerService);
  private employeeService = inject(EmployeeService);
  private jobService = inject(JobService);

  private readonly tokenKey = 'hourforge_token';
  private readonly userKey = 'hourforge_user';

  user: AuthUser | null = null;
  dataLoaded = false;

  constructor() {
    const raw = localStorage.getItem(this.userKey);
    this.user = raw ? JSON.parse(raw) : null;
  }

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  async register(
    name: string,
    email: string,
    password: string,
    preferredLang?: string,
    username?: string,
  ) {
    const res = await firstValueFrom(
      this.http.post<{ token: string; user: AuthUser }>(
        `${environment.apiUrl}/auth/register`,
        { name, email, password, preferredLang, username },
      ),
    );
    await this.setSession(res.token, res.user);
    return res.user;
  }

  async login(login: string, password: string) {
    const res = await firstValueFrom(
      this.http.post<{ token: string; user: AuthUser }>(
        `${environment.apiUrl}/auth/login`,
        { login, password },
      ),
    );
    await this.setSession(res.token, res.user);
    return res.user;
  }

  async refreshMe() {
    const res = await firstValueFrom(
      this.http.get<{ user: AuthUser }>(`${environment.apiUrl}/auth/me`),
    );
    this.user = res.user;
    localStorage.setItem(this.userKey, JSON.stringify(res.user));
    return res.user;
  }

  async updatePreferredLang(preferredLang: string) {
    const res = await firstValueFrom(
      this.http.patch<{ user: AuthUser }>(`${environment.apiUrl}/auth/me`, {
        preferredLang,
      }),
    );
    this.user = res.user;
    localStorage.setItem(this.userKey, JSON.stringify(res.user));
    return res.user;
  }

  async loadAppData() {
    await Promise.all([
      this.customerService.load(),
      this.employeeService.load(),
      this.jobService.load(),
    ]);
    this.dataLoaded = true;
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.user = null;
    this.dataLoaded = false;
    this.customerService.clearLocal();
    this.employeeService.clearLocal();
    this.jobService.clearLocal();
    this.router.navigateByUrl('/login');
  }

  private async setSession(token: string, user: AuthUser) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.user = user;
    await this.loadAppData();
  }
}
