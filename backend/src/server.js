const app = require('./app');
const { pingDb } = require('./config/db');

const port = Number(process.env.PORT) || 3000;

async function start() {
  try {
    await pingDb();
    console.log('MySQL: connected');
  } catch (err) {
    console.warn('MySQL: not connected yet —', err.message);
    console.warn('API still starts; fix .env + MySQL, then run npm run db:setup.');
  }

  app.listen(port, () => {
    console.log(`Hourforge API listening on http://localhost:${port}`);
  });
}

start();
