import * as mongoose from 'mongoose';

// Document interface
interface IAdminDocument extends mongoose.Document {
  prof: boolean;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  teams: Array<number>;
  createdAt: Date;
}

// Model interface
interface IAdminModel extends mongoose.Model<IAdminDocument> {
  findByUsername(username: string, lastname: string, firstname: string): Promise<IAdminDocument>;
}

// Admin Schema
const AdminSchema = new mongoose.Schema({
  prof: {
    type: Boolean,
    default: false,
    required: false,
  },
  username: {
    type: String,
    required: true
  },
  lastname: {
    type: String,
    required: true
  },
  firstname: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: false
  },
  teams: {
    type: Array,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/*
// Methods
adminSchema.method({
});
*/

// Statics
AdminSchema.statics = {
  /**
   * create a new admin
   * @param {string} username - username
   * @param {string} lastname - lastname
   * @param {string} firstname - firstname
   * @returns {Promise<IAdminDocument>} admin
   */
  create(username: string, lastname: string, firstname: string): Promise<IAdminDocument> {
    // console.log(`input: ${username}, ${lastname}, ${firstname}`);
    const admin = new Admin({ username, lastname, firstname });
    return admin
      .save()
      .catch(err => console.log(`Admin.create() error! ${err}`));
  }
};

const Admin: IAdminModel = <IAdminModel>mongoose.model('Admin', AdminSchema);

export { Admin, IAdminDocument };
