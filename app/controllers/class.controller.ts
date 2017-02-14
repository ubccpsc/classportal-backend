import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { User, IUserDocument } from '../models/user.model';
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
      columns: ['csid', 'snum', 'lastname', 'firstname'],
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
          logger.info('sliced');

          // update STUDENT model and return number of added and deleted
          let added = 0;
          const saveIt = (info: any): Promise<any> => {
            // make sure all the necessary data exists
            // if (info.csid && info.csid && info.csid && info.csid) {
            // create a new user with the info
            const user = new User({
              csid: info.csid,
              snum: info.snum,
              lastname: info.lastname,
              firstname: info.firstname,
            });
            return user
              .save()
              .then(() => {
                logger.info('just added a user!');
                added++;
              })
              .catch(() => {
                // no point printing error about adding deuplicate?
              });
            // } else return Promise.reject('oops');
          };

          // sliced.forEach(saveIt);
          return Promise.all(sliced.map(saveIt))
            .then(() => {
              logger.info(`Updated ${added} users!`);
              res.json(200, 'update class list');
              return next();
            })
            .catch(() => {
              res.json(500);
              return next('oops!');
            });
        }
      }));
  } else {
    logger.info('Error: no file uploaded');
    res.json(500, 'no file uploaded');
    return next();
  }
}

export { update }
