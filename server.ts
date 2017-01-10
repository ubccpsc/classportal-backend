import mongoose = require('mongoose');
import { config } from './config/env';
import { app } from './config/restify';
import { logger } from './utils/logger';
import { Admin, IAdminDocument } from './app/models/admin.model';

// use native ES6 promises instead of mongoose promise library
mongoose.Promise = global.Promise;

// connect to mongodb
const options = { server: { socketOptions: { keepAlive: 1 } } };
const db: mongoose.Connection = mongoose.connect(config.db, options).connection;

// print mongoose logs in dev and test env
if (config.verbose) mongoose.set('debug', true);

// throw error on db error
db.on('error', (err: any) => {
  throw new Error(`Unable to connect to database: ${err}`);
});

// execute callback when db connection is made
db.once('open', () => {
  logger.info(`\nConnected to database: ${config.db}`);

  if (config.admins.length < 1) {
    throw new Error('Error: No admins specified in config.admins!');
  } else {
    // get admins
    let admins = config.admins;
    logger.info(`\nAdmins: ${admins.map((admin) => admin.firstname )}`);
    logger.info('Verifying that admins exist in db...');

    // write all admins to db
    const promises: Array<Promise<IAdminDocument>> = admins.map((admin: any) => {
      return Admin.create(admin.username, admin.lastname, admin.firstname)
        .then((savedAdmin: IAdminDocument) => {
          return savedAdmin;
        });
    });

    // execute promises array
    return Promise.all(promises)
      .then(() => {
        // finally, start the server
        app.listen(config.port, () => {
          logger.info(`\n${config.name} is running at ${app.url}`);
        });
      })
      .catch((err: any) => console.log(err));
  }
});

export { app };
