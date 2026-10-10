/**
 * Apply schema.sql and seed demo + superuser + sample data.
 * Usage: npm run db:setup
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function insertUser(conn, { email, username, password, name, preferredLang }) {
  const hash = await bcrypt.hash(password, 10);
  const [result] = await conn.query(
    `INSERT INTO users (email, username, password_hash, name, preferred_lang)
     VALUES (?, ?, ?, ?, ?)`,
    [email, username, hash, name, preferredLang]
  );
  return result.insertId;
}

async function seedSampleData(conn, userId) {
  const [c1] = await conn.query(
    `INSERT INTO customers (user_id, company_name, street, house_number, postal_code, city)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, 'Acme Bau GmbH', 'Industriestrasse', '12', 8004, 'Zürich']
  );
  const [c2] = await conn.query(
    `INSERT INTO customers (user_id, company_name, street, house_number, postal_code, city)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, 'Café Luna', 'Bahnhofplatz', '3a', 3011, 'Bern']
  );
  const [c3] = await conn.query(
    `INSERT INTO customers (user_id, company_name, street, house_number, postal_code, city)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, 'Nordwind Logistics', 'Hafenweg', '88', 4057, 'Basel']
  );

  const [e1] = await conn.query('INSERT INTO employees (user_id, name) VALUES (?, ?)', [
    userId,
    'Alice Meier',
  ]);
  const [e2] = await conn.query('INSERT INTO employees (user_id, name) VALUES (?, ?)', [
    userId,
    'Bob Keller',
  ]);
  const [e3] = await conn.query('INSERT INTO employees (user_id, name) VALUES (?, ?)', [
    userId,
    'Carla Rossi',
  ]);

  const [j1] = await conn.query(
    `INSERT INTO jobs
      (user_id, customer_id, job_number, night_shift_time, invoice_number, hourly_rate,
       comment, total_time, employee_date, employer_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      c1.insertId,
      1001,
      '22:00-06:00',
      5001,
      65.5,
      'Scaffold install — east wing',
      '16:30',
      '2026-03-01',
      '2026-03-02',
    ]
  );
  const [j2] = await conn.query(
    `INSERT INTO jobs
      (user_id, customer_id, job_number, night_shift_time, invoice_number, hourly_rate,
       comment, total_time, employee_date, employer_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      c2.insertId,
      1002,
      '',
      5002,
      48,
      'Kitchen remodel punch list',
      '7:45',
      '2026-03-05',
      '2026-03-05',
    ]
  );
  const [j3] = await conn.query(
    `INSERT INTO jobs
      (user_id, customer_id, job_number, night_shift_time, invoice_number, hourly_rate,
       comment, total_time, employee_date, employer_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      c3.insertId,
      1003,
      '23:00-05:00',
      0,
      72,
      'Night unload — random rain delay',
      '11:00',
      '2026-03-08',
      '',
    ]
  );

  await conn.query(
    `INSERT INTO job_entries
      (job_id, employee_id, entry_date, start_time, end_time, pause, duration,
       work_hours, night_hours, amount, surcharge_note, sort_order)
     VALUES
      (?, ?, '2026-03-01', '07:00', '16:00', '00:30', '08:30', 8.5, 0, 556.75, '', 0),
      (?, ?, '2026-03-02', '07:30', '15:30', '00:30', '07:30', 7.5, 0.5, 524.0, 'Early start', 1)`,
    [j1.insertId, e1.insertId, j1.insertId, e2.insertId]
  );

  await conn.query(
    `INSERT INTO job_entries
      (job_id, employee_id, entry_date, start_time, end_time, pause, duration,
       work_hours, night_hours, amount, surcharge_note, sort_order)
     VALUES
      (?, ?, '2026-03-05', '09:00', '13:00', '00:15', '03:45', 3.75, 0, 180.0, '', 0),
      (?, ?, '2026-03-05', '13:30', '17:30', '00:00', '04:00', 4.0, 0, 192.0, 'Tile rush', 1)`,
    [j2.insertId, e3.insertId, j2.insertId, e1.insertId]
  );

  await conn.query(
    `INSERT INTO job_entries
      (job_id, employee_id, entry_date, start_time, end_time, pause, duration,
       work_hours, night_hours, amount, surcharge_note, sort_order)
     VALUES
      (?, ?, '2026-03-08', '22:00', '05:00', '00:30', '06:30', 4.0, 2.5, 468.0, 'Night surcharge', 0),
      (?, ?, '2026-03-09', '06:00', '10:30', '00:00', '04:30', 4.5, 0, 324.0, 'Coffee run counted as break? no.', 1)`,
    [j3.insertId, e2.insertId, j3.insertId, e3.insertId]
  );
}

async function run() {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'hourforge';

  const schemaPath = path.join(__dirname, '../../sql/schema.sql');

  console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  try {
    console.log(`Resetting database ${dbName}...`);
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Applying schema.sql...');
    await conn.query(schemaSql);

    await conn.query(`USE \`${dbName}\``);

    const demoId = await insertUser(conn, {
      email: 'demo@hourforge.app',
      username: 'demo',
      password: 'demo1234',
      name: 'Demo User',
      preferredLang: 'en',
    });

    const superId = await insertUser(conn, {
      email: 'superuser@hourforge.app',
      username: 'superuser',
      password: 'test123',
      name: 'Super User',
      preferredLang: 'en',
    });

    console.log('Seeding sample customers / employees / jobs...');
    await seedSampleData(conn, superId);

    // A couple of rows on the demo account too
    await conn.query(
      `INSERT INTO customers (user_id, company_name, street, house_number, postal_code, city)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [demoId, 'Demo Client AG', 'Teststrasse', '1', 8000, 'Zürich']
    );
    await conn.query('INSERT INTO employees (user_id, name) VALUES (?, ?)', [
      demoId,
      'Demo Worker',
    ]);

    console.log(`Database setup complete: ${dbName}`);
    console.log('Demo login:      demo@hourforge.app / demo1234  (or username: demo)');
    console.log('Superuser login: superuser / test123  (or superuser@hourforge.app)');
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('db:setup failed:', err.message);
  console.error('Ensure MySQL is running and DB_USER/DB_PASSWORD in backend/.env are correct.');
  process.exit(1);
});
