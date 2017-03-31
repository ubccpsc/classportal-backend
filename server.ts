import mongoose = require('mongoose');
import { config } from './config/env';
import { app } from './config/restify';
import { seedData } from './config/seed';
import { logger } from './utils/logger';

// use native ES6 promises instead of mongoose promise library
mongoose.Promise = global.Promise;

// connect to database
const connection = mongoose.connect(config.db, {
  server: {
    socketOptions: {
      keepAlive: 1,
    },
  },
}).connection;

// print to log if debug flag is set
if (config.debug) mongoose.set('debug', true);

// throw error on connection error
connection.on('error', (err: any) => {
  throw new Error(`Unable to connect to database: ${err}`);
});

// intial setup upon connection success
connection.once('open', () => {
  return Promise.resolve()
    .then(() => {
      logger.info(`\nConnected to database: ${config.db}`);
      // seedData()
    })
    .then(() => {
      app.listen(config.port, () => {
        logger.info(`\n${config.app_name} is listening on ${app.url}`);
        logger.info('config:', config);
      });
    })
    .catch(logger.info);
});

// Enable to seed data in new app and database.
// seedData();

export { app };
