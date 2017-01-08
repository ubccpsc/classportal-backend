import * as mongoose from 'mongoose';
const Schema = mongoose.Schema;

// Document interface
interface IStudentDocument extends mongoose.Document {
  csid: string;
  snum: string;
  firstname: string;
  lastname: string;
  username: string;
  createdAt: Date;
}

// Model interface
interface IStudentModel extends mongoose.Model<IStudentDocument> {
  findByUsername(username: string): Promise<IStudentDocument>;
  findByCsidSnum(csid: string, snum: string): Promise<IStudentDocument>;
}

// Student Schema
const StudentSchema = new Schema({
  csid: {
    type: String,
    required: true,
    unique: true,
  },
  snum: {
    type: String,
    match: /^([0-9]){8}$/,
    required: true,
    unique: true,
  },
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Statics
StudentSchema.statics = {
  /**
  * Find a student by username.
  * @param {string} username - The GitHub username of the student.
  * @returns {Promise<IStudentDocument>} Returns a Promise of the student.
  */
  findByUsername: function (username: string): Promise<IStudentDocument> {
    return this
      .find({ username: username })
      .exec()
      .then((student: Array<IStudentModel>) => {
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
  findByCsidSnum: function (csid: string, snum: string): Promise<IStudentDocument> {
    return this
      .find({ csid: csid, snum: snum })
      .exec()
      .then((student: Array<IStudentModel>) => {
        if (student && student.length) {
          return student[0];
        }
        return Promise.reject('err');
      });
  }
};

const Student: IStudentModel = <IStudentModel>mongoose.model('Student', StudentSchema);

export { Student, IStudentDocument };
