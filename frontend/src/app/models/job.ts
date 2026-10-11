import { Customer } from './customer';
import { Employee } from './employee';

export interface Job {
  id: string;
  jobNumber: number;
  customer: Customer;
  nightShiftTime: string;
  invoiceNumber: string;
  hourlyRate: number;
  entries: JobEntry[];
  comment: string;
  totalTime: string;
  employeeDate: string;
  employeeSignature: string;
  employerDate: string;
  employerSignature: string;
}

export interface JobEntry {
  employee: Employee;
  date: string;
  start: string;
  end: string;
  pause: string;
  duration: string;
  workHours: number;
  nightHours: number;
  amount: number;
  surchargeNote: string;
}

export interface EmployeeJobRecord {
  jobId: string;
  jobDate: string;
  customerName: string;
  hourlyRate: number;
  comment: string;
  entry: JobEntry;
}
