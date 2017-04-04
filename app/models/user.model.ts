import * as mongoose from 'mongoose';
let passportLocalMongoose = require('../passport-local-mongoose');
let Schema = mongoose.Schema;
let bcrypt = require('../bcrypt-nodejs');
let findOrCreate = require('../mongoose-findorcreate');


interface CourseData {
  courseId: string;
  role: string;
  team: number[];
  repos: string[];
}

interface IUserDocument extends mongoose.Document {
  token: string;
  snum: string;
  csid: string;
  username: string;
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
  password: {
    type: String,
  },
  username: {
    type: String,
    required: true,
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
  courses: [
    {
      courseId: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        required: true,
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

UserSchema.plugin(findOrCreate);
UserSchema.plugin(passportLocalMongoose);


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
};

const User: IUserModel = <IUserModel>mongoose.model('User', UserSchema);

export { IUserDocument, User };
