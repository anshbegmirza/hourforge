const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { authRouter } = require('./modules/auth/auth.routes');
const { customersRouter } = require('./modules/customers/customers.routes');
const { employeesRouter } = require('./modules/employees/employees.routes');
const { jobsRouter } = require('./modules/jobs/jobs.routes');
const { requireAuth } = require('./middleware/requireAuth');
const { encodeId } = require('./utils/publicId');

const app = express();
const corsOrigin = (process.env.CORS_ORIGIN || 'http://localhost:4200,http://localhost:4201')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: corsOrigin.length === 1 ? corsOrigin[0] : corsOrigin }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'hourforge-api',
    mode: process.env.APP_MODE === 'prod' ? 'prod' : 'test',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'hourforge-api',
    version: 'v1',
    mode: process.env.APP_MODE === 'prod' ? 'prod' : 'test',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/customers', customersRouter);
app.use('/api/v1/employees', employeesRouter);
app.use('/api/v1/jobs', jobsRouter);

app.get('/api/v1/secure/ping', requireAuth, (req, res) => {
  res.json({
    ok: true,
    user_id: encodeId(req.user.id),
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

module.exports = app;
