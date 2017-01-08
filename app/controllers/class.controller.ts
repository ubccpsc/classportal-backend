import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { logger } from '../../utils/logger';

/**
 * Update a class list
 * Input: CSV
 */
function update(req: restify.Request, res: restify.Response, next: restify.Next) {
  // check if CSV was successfully uploaded
  if (req.files && req.files[0] && req.files[0].path) {
    // set parser settings
    const options = {
      columns: ['CSID', 'SNUM', 'LAST', 'FIRST'],
      skip_empty_lines: true,
      trim: true,
    };

    // read csv
    fs.createReadStream(req.files[0].path)
      // parse csv
      .pipe(parse(options, (err, data) => {
        if (err) {
          logger.info(`err: ${err}`);
          res.json(500, 'file could not be parsed!!');
          return next();
        } else {
          // remove headers
          const sliced = [...data.slice(1)];

          // update STUDENT model and return number of added and deleted
          logger.info(`Updating student collection`);
          res.json(200, 'update class list');
          return next();
        }
      }));
  } else {
    logger.info('Error: no file uploaded');
    res.json(500, 'no file uploaded');
    return next();
  }
}

export { update }
