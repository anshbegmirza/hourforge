const express = require('express');
const { pool } = require('../../config/db');
const { requireAuth } = require('../../middleware/requireAuth');
const { decodeId } = require('../../utils/publicId');
const {
  publicCustomer,
  publicEmployee,
  publicJobEntry,
  publicJob,
} = require('../../utils/publicModels');
const {
  nextInvoiceNumber,
  yearToken,
} = require('../../utils/invoiceNumber');

const router = express.Router();
router.use(requireAuth);

async function loadJobBundle(userId, jobId) {
  const [jobs] = await pool.query(
    'SELECT * FROM jobs WHERE id = ? AND user_id = ? LIMIT 1',
    [jobId, userId]
  );
  if (!jobs.length) {
    return null;
  }
  const job = jobs[0];

  let customer = null;
  if (job.customer_id) {
    const [customers] = await pool.query(
      'SELECT * FROM customers WHERE id = ? AND user_id = ? LIMIT 1',
      [job.customer_id, userId]
    );
    if (customers.length) {
      customer = publicCustomer(customers[0]);
    }
  }

  const [entries] = await pool.query(
    `SELECT e.*, emp.name AS employee_name
     FROM job_entries e
     LEFT JOIN employees emp ON emp.id = e.employee_id
     WHERE e.job_id = ?
     ORDER BY e.sort_order ASC, e.id ASC`,
    [jobId]
  );

  const mappedEntries = entries.map((row) =>
    publicJobEntry(
      row,
      row.employee_id
        ? publicEmployee({ id: row.employee_id, name: row.employee_name || '' })
        : { id: '', name: '' }
    )
  );

  return publicJob(job, customer, mappedEntries);
}

async function replaceEntries(conn, jobId, userId, entries) {
  await conn.query('DELETE FROM job_entries WHERE job_id = ?', [jobId]);

  const list = Array.isArray(entries) ? entries : [];
  for (let i = 0; i < list.length; i += 1) {
    const entry = list[i] || {};
    let employeeId = null;
    const employeePublicId = entry.employee?.id;
    if (employeePublicId) {
      const decoded = decodeId(employeePublicId);
      if (decoded != null) {
        const [owned] = await conn.query(
          'SELECT id FROM employees WHERE id = ? AND user_id = ? LIMIT 1',
          [decoded, userId]
        );
        if (owned.length) {
          employeeId = decoded;
        }
      }
    }

    await conn.query(
      `INSERT INTO job_entries
        (job_id, employee_id, entry_date, start_time, end_time, pause, duration,
         work_hours, night_hours, amount, surcharge_note, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        jobId,
        employeeId,
        String(entry.date || ''),
        String(entry.start || ''),
        String(entry.end || ''),
        String(entry.pause || ''),
        String(entry.duration || ''),
        Number(entry.workHours) || 0,
        Number(entry.nightHours) || 0,
        Number(entry.amount) || 0,
        String(entry.surchargeNote || ''),
        i,
      ]
    );
  }
}

function resolveCustomerId(bodyCustomer) {
  if (!bodyCustomer?.id) {
    return null;
  }
  return decodeId(bodyCustomer.id);
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id FROM jobs WHERE user_id = ? ORDER BY job_number DESC, id DESC',
      [req.user.id]
    );
    const jobs = [];
    for (const row of rows) {
      const job = await loadJobBundle(req.user.id, row.id);
      if (job) {
        jobs.push(job);
      }
    }
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = decodeId(req.params.id);
    if (id == null) {
      return res.status(400).json({ message: 'Invalid id.' });
    }
    const job = await loadJobBundle(req.user.id, id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const body = req.body || {};
    let customerId = resolveCustomerId(body.customer);
    if (customerId != null) {
      const [owned] = await conn.query(
        'SELECT id FROM customers WHERE id = ? AND user_id = ? LIMIT 1',
        [customerId, req.user.id]
      );
      if (!owned.length) {
        customerId = null;
      }
    }

    const [maxRows] = await conn.query(
      'SELECT COALESCE(MAX(job_number), 0) AS max_num FROM jobs WHERE user_id = ?',
      [req.user.id]
    );
    const jobNumber = Number(body.jobNumber) || Number(maxRows[0].max_num) + 1;

    const yy = yearToken();
    const [invRows] = await conn.query(
      'SELECT invoice_number FROM jobs WHERE user_id = ? AND invoice_number LIKE ?',
      [req.user.id, `IV${yy}-%`]
    );
    const invoiceNumber = nextInvoiceNumber(
      invRows.map((row) => row.invoice_number),
    );

    const [result] = await conn.query(
      `INSERT INTO jobs
        (user_id, customer_id, job_number, night_shift_time, invoice_number, hourly_rate,
         comment, total_time, employee_date, employee_signature, employer_date, employer_signature)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        customerId,
        jobNumber,
        String(body.nightShiftTime || ''),
        invoiceNumber,
        Number(body.hourlyRate) || 0,
        String(body.comment || ''),
        String(body.totalTime || ''),
        String(body.employeeDate || ''),
        String(body.employeeSignature || ''),
        String(body.employerDate || ''),
        String(body.employerSignature || ''),
      ]
    );

    await replaceEntries(conn, result.insertId, req.user.id, body.entries);
    await conn.commit();

    const job = await loadJobBundle(req.user.id, result.insertId);
    return res.status(201).json({ job });
  } catch (err) {
    await conn.rollback();
    return next(err);
  } finally {
    conn.release();
  }
});

router.put('/:id', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const id = decodeId(req.params.id);
    if (id == null) {
      return res.status(400).json({ message: 'Invalid id.' });
    }

    await conn.beginTransaction();

    const [existing] = await conn.query(
      'SELECT id FROM jobs WHERE id = ? AND user_id = ? LIMIT 1',
      [id, req.user.id]
    );
    if (!existing.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Job not found.' });
    }

    const body = req.body || {};
    let customerId = resolveCustomerId(body.customer);
    if (customerId != null) {
      const [owned] = await conn.query(
        'SELECT id FROM customers WHERE id = ? AND user_id = ? LIMIT 1',
        [customerId, req.user.id]
      );
      if (!owned.length) {
        customerId = null;
      }
    }

    // invoice_number is assigned on create and is read-only afterward
    await conn.query(
      `UPDATE jobs SET
        customer_id = ?, job_number = ?, night_shift_time = ?, hourly_rate = ?,
        comment = ?, total_time = ?, employee_date = ?, employee_signature = ?,
        employer_date = ?, employer_signature = ?
       WHERE id = ? AND user_id = ?`,
      [
        customerId,
        Number(body.jobNumber) || 0,
        String(body.nightShiftTime || ''),
        Number(body.hourlyRate) || 0,
        String(body.comment || ''),
        String(body.totalTime || ''),
        String(body.employeeDate || ''),
        String(body.employeeSignature || ''),
        String(body.employerDate || ''),
        String(body.employerSignature || ''),
        id,
        req.user.id,
      ]
    );

    await replaceEntries(conn, id, req.user.id, body.entries);
    await conn.commit();

    const job = await loadJobBundle(req.user.id, id);
    return res.json({ job });
  } catch (err) {
    await conn.rollback();
    return next(err);
  } finally {
    conn.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = decodeId(req.params.id);
    if (id == null) {
      return res.status(400).json({ message: 'Invalid id.' });
    }

    const [result] = await pool.query(
      'DELETE FROM jobs WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Job not found.' });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.delete('/', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM jobs WHERE user_id = ?', [req.user.id]);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = { jobsRouter: router };
