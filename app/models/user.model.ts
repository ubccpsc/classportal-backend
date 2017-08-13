import * as mongoose from 'mongoose';
let Schema = mongoose.Schema;
let findOrCreate = require('mongoose-findorcreate');
import { logger } from '../../utils/logger';


interface CourseData {
  courseId: [Object];
  role: string;
  team: number[];
  repos: string[];
}

interface IUserDocument extends mongoose.Document {
  token: string;
  snum: string;
  csid: string;
  username: string;
  userrole: string;
  fname: string;
  lname: string;
  courses: CourseData[];
  createServerToken(): Promise<string>;
  deleteServerToken(): Promise<string>;
}

interface IUserModel extends mongoose.Model<IUserDocument> {
  findByUsername(username: string): Promise<IUserDocument>;
  findByCsidSnum(csid: string, snum: string): Promise<IUserDocument>;
  findWith(query: Object): Promise<IUserDocument>;
  findOrReplace(query: Object): Promise<IUserDocument>;
  findOrCreate(query: Object): Promise<IUserDocument>;
}

const UserSchema = new mongoose.Schema({
  token: {
    type: String,
  },
  username: {
    type: String,
    default: '',
  },
  snum: {
    type: String,
    required: true,
  },
  csid: {
    type: String,
    required: true,
  },
  fname: {
    type: String,
  },
  lname: {
    type: String,
  },
  userrole: {
    type: String,
    default: 'student',
  },
  courses: [
    {
      courseId: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Course',
        required: true,
      },
      role: {
        type: String,
      },
      team: {
        type: [Number],
      },
      repos: {
        type: [String],
      },
    },
  ],
});

UserSchema.methods = {
  createServerToken: (): Promise<string> => {
    let servertoken: string = Math.random().toString(36).slice(2);
    // todo: save token
    return Promise.resolve(servertoken);
  },

  deleteServerToken: (): Promise<string> => {
    // todo: delete token
    return Promise.resolve('');
  },
};

UserSchema.statics = {
  /**
  * Find a user by username.
  * @param {string} username - The GitHub username of the user.
  * @returns {Promise<IUserDocument>} Returns a Promise of the user.
  */
  findByUsername: (username: string): Promise<IUserDocument> => {
    return this
      .find({ username })
      .exec()
      .then((user: IUserDocument[]) => {
        return (user && user.length) ? Promise.resolve(user[0]) : Promise.reject('err');
      });
  },

  /**
  * Find a user by csid and snum
  * @param {string} csid - CS ID
  * @param {string} snum - user number
  * @returns {Promise<IUserDocument>} Returns a Promise of the user.
  */
  findByCsidSnum: (csid: string, snum: string): Promise<IUserDocument> => {
    return this
      .find({ csid, snum })
      .exec()
      .then((user: IUserDocument[]) => {
        return (user && user.length) ? Promise.resolve(user[0]) : Promise.reject('err');
      });
  },

  /**
  * Find a user with a query
  * @param {Object} query query object
  * @returns {Promise<IUserDocument>} Returns a Promise of the user.
  */
  findWith: (query: Object): Promise<IUserDocument> => {
    return this
      .find(query)
      .exec()
      .then((user: IUserDocument[]) => {
        return (user && user.length) ? Promise.resolve(user[0]) : Promise.reject('err');
      });
  },

  /**
  * Find a user by Github username. If does not exist, then user created in DB.
  * @param {string} github username
  * @returns {Promise<IUserDocument>} Returns a Promise of the user.
  */
  findOrCreate: (query: Object): Promise<IUserDocument> => {
    return User
      .findOne(query)
      .exec()
      .then((user) => {
        if (user) {
          return Promise.resolve(user);
        } else {
          return User.create(query)
            .then((q) => { return q.save(); })
            .catch((err) => { logger.info(err); });
        }
      });
  },
};

const User: IUserModel = <IUserModel>mongoose.model('User', UserSchema);

export { IUserDocument, User, UserSchema, CourseData };
