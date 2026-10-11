/** ponytail: tiny assert check for invoice sequence — run: node src/utils/invoiceNumber.selfcheck.js */
const { nextInvoiceNumber } = require('./invoiceNumber');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(nextInvoiceNumber([], 2026) === 'IV26-A001', 'empty → A001');
assert(nextInvoiceNumber(['IV26-A001'], 2026) === 'IV26-A002', 'A001 → A002');
assert(
  nextInvoiceNumber(['IV26-A999'], 2026) === 'IV26-B001',
  'A999 → B001',
);
assert(
  nextInvoiceNumber(['IV25-A050', 'IV26-A003'], 2026) === 'IV26-A004',
  'ignore other years',
);
assert(
  nextInvoiceNumber(['IV26-B010', 'IV26-A999'], 2026) === 'IV26-B011',
  'highest letter wins',
);

console.log('invoiceNumber.selfcheck ok');
