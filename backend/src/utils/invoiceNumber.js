/**
 * Invoice codes: IV{YY}-{A-Z}{001-999}
 * After A999 → B001, etc.
 */
function parseInvoice(value) {
  const m = /^IV(\d{2})-([A-Z])(\d{3})$/.exec(String(value || '').trim());
  if (!m) return null;
  return { yy: m[1], letter: m[2], num: Number(m[3]) };
}

function formatInvoice(yy, letter, num) {
  return `IV${yy}-${letter}${String(num).padStart(3, '0')}`;
}

function yearToken(year = new Date().getFullYear()) {
  return String(year % 100).padStart(2, '0');
}

function nextInvoiceNumber(existing, year = new Date().getFullYear()) {
  const yy = yearToken(year);
  let maxLetter = null;
  let maxNum = 0;

  for (const value of existing || []) {
    const parsed = parseInvoice(value);
    if (!parsed || parsed.yy !== yy) continue;
    if (
      !maxLetter ||
      parsed.letter > maxLetter ||
      (parsed.letter === maxLetter && parsed.num > maxNum)
    ) {
      maxLetter = parsed.letter;
      maxNum = parsed.num;
    }
  }

  if (!maxLetter) {
    return formatInvoice(yy, 'A', 1);
  }
  if (maxNum >= 999) {
    if (maxLetter === 'Z') {
      throw new Error('Invoice series exhausted for year ' + yy);
    }
    const nextLetter = String.fromCharCode(maxLetter.charCodeAt(0) + 1);
    return formatInvoice(yy, nextLetter, 1);
  }
  return formatInvoice(yy, maxLetter, maxNum + 1);
}

module.exports = {
  parseInvoice,
  formatInvoice,
  yearToken,
  nextInvoiceNumber,
};
