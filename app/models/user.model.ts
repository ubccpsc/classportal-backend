import * as mongoose from 'mongoose';

interface CourseData {
  courseId: string;
  role: string;
  teams: number[]; // Students may only be part of 1 team, while TAs may be responsible for multiple
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
}

// TODO
interface IUserModel extends mongoose.Model<IUserDocument> {
  storeServerToken(): Promise<string>;
  deleteServerToken(): Promise<string>;
  findByUsername(): Promise<string>;
  findByUsername(username: string): Promise<IUserDocument>;
  findByCsidSnum(csid: string, snum: string): Promise<IUserDocument>;
}

const UserSchema = new mongoose.Schema({
  token: {
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
      teams: {
        type: [Number],
      },
      repos: {
        type: [String],
      },
    },
  ],
});

// TODO
UserSchema.statics = {
  /**
  * Find a student by username.
  * @param {string} username - The GitHub username of the student.
  * @returns {Promise<IStudentDocument>} Returns a Promise of the student.
  */
  findByUsername: function (username: string): Promise<IUserModel> {
    return this
      .find({ username: username })
      .exec()
      .then((student: IUserModel[]) => {
        if (student && student.length) {
          return student[0];
        }
        return Promise.reject('err');
      });
  },

  /**
  * Find a student by csid and snum
  * @param {string} csid - CS ID
  * @param {string} snum - student number
  * @returns {Promise<IStudentDocument>} Returns a Promise of the student.
  */
  findByCsidSnum: function (csid: string, snum: string): Promise<IUserModel> {
    return this
      .find({ csid: csid, snum: snum })
      .exec()
      .then((student: IUserModel[]) => {
        if (student && student.length) {
          return student[0];
        }
        return Promise.reject('err');
      });
  },
  storeServerToken(): Promise<string> {
    let servertoken: string = Math.random().toString(36).slice(2);
    return Promise.resolve(servertoken);
  },
  deleteServerToken(): Promise<string> {
    return Promise.resolve('');
  },
};

const User: IUserModel = <IUserModel>mongoose.model('User', UserSchema);

export { IUserDocument, IUserModel, User };
