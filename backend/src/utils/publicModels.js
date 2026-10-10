const { encodeId } = require('./publicId');

function publicUser(row) {
  return {
    id: encodeId(row.id),
    email: row.email,
    username: row.username || null,
    name: row.name,
    preferredLang: row.preferred_lang || null,
    hasGoogle: Boolean(row.google_id),
    hasPassword: Boolean(row.password_hash),
  };
}

function publicCustomer(row) {
  return {
    id: encodeId(row.id),
    companyName: row.company_name,
    street: row.street || '',
    houseNumber: row.house_number || '',
    postalCode: Number(row.postal_code) || 0,
    city: row.city || '',
  };
}

function publicEmployee(row) {
  return {
    id: encodeId(row.id),
    name: row.name,
  };
}

function publicJobEntry(row, employee) {
  return {
    employee: employee || {
      id: encodeId(row.employee_id),
      name: row.employee_name || '',
    },
    date: row.entry_date || '',
    start: row.start_time || '',
    end: row.end_time || '',
    pause: row.pause || '',
    duration: row.duration || '',
    workHours: Number(row.work_hours) || 0,
    nightHours: Number(row.night_hours) || 0,
    amount: Number(row.amount) || 0,
    surchargeNote: row.surcharge_note || '',
  };
}

function publicJob(row, customer, entries) {
  return {
    id: encodeId(row.id),
    jobNumber: Number(row.job_number) || 0,
    customer: customer || null,
    nightShiftTime: row.night_shift_time || '',
    invoiceNumber: Number(row.invoice_number) || 0,
    hourlyRate: Number(row.hourly_rate) || 0,
    entries: entries || [],
    comment: row.comment || '',
    totalTime: row.total_time || '',
    employeeDate: row.employee_date || '',
    employeeSignature: row.employee_signature || '',
    employerDate: row.employer_date || '',
    employerSignature: row.employer_signature || '',
  };
}

module.exports = {
  publicUser,
  publicCustomer,
  publicEmployee,
  publicJobEntry,
  publicJob,
};
