import * as mongoose from 'mongoose';
import {logger} from '../../utils/logger';

interface IGradeDocument extends mongoose.Document {
  snum: string;
  csid: string;
  deliverable: string;
  fname: string;
  lname: string;
  course: string;
  comments: string;
  grade: number;
}

interface IGradeModel extends mongoose.Model<IGradeDocument> {
  findOrCreate(query: any): Promise<IGradeDocument>;
}

const GradeSchema = new mongoose.Schema({
  snum:    {
    type:     String,
    required: true,
  },
  csid:    {
    type:     String,
    required: true,
  },
  course:   {
    type:     String,
    required: true,
  },
  fname:    {
    type:     String,
    default:  '',
  },
  lname:    {
    type:     String,
    default:  '',
  },
  deliverable:   {
    required: true,
    type:     String,
  },
  comments: {
    type: String,
  },
  grade: {
    type: Number,
  }
});

GradeSchema.static({

  /**
   * Finds a Grade and updates it, or creates the Grade if it does not exist.
   * @param {ICourseDocument} search parameters
   * @returns {Promise<IGradeDocument>} Returns a Promise of the user.
   */
  findOrCreate: (query: any): Promise<IGradeDocument> => {
    return Grade.findOne({
      snum:  query.snum,
      csid:  query.csid,
      deliverable: query.deliverable,
      course: query.course,
    })
    .then((grade: IGradeDocument) => {
      if (grade) {
        return grade;
      } 
      return Grade.create({
        snum: query.snum, 
        csid: query.csid, 
        deliverable: query.deliverable,
        course: query.course,
      })
        .then((grade: IGradeDocument) => {
          return grade;
        });
    });
  },
});

const Grade: IGradeModel = <IGradeModel>mongoose.model('Grade', GradeSchema);

export {IGradeDocument, IGradeModel, Grade, GradeSchema};
