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

// execute callback once connection is made
connection.once('open', () => {
  logger.info(`\nConnected to database: ${config.db}`);

  // seed initial data, then start listening
  return Promise.resolve()
    // .then (seedData)
    .then(() => {
      app.listen(config.port, () => {
        logger.info(`\n${config.app_name} is running at ${app.url}`);
        console.log('config =\n', config);
      });
    })
    .catch(logger.info);
});

export { app };
