import * as mongoose from 'mongoose';
import { logger } from '../../utils/logger';


interface IGradeDocument extends mongoose.Document {
  courseId: string;
  snum: string;
  deliv: string;
  details: Object;
}

interface IGradeModel extends mongoose.Model<IGradeDocument> {
  findOrCreate(query: Object): Promise<IGradeDocument>;
  createOrUpdate(course: IGradeDocument): Promise<IGradeDocument>;
}

const GradeSchema = new mongoose.Schema({
  snum: {
    type: String,
    required: true,
  },
  deliv: {
    required: true,
    type: String,
  },
  details: {
    type: Object,
  },
});

GradeSchema.static({

  /**
  * Find a Grade by object query. If doesn't exist, creates it based on object query and returns it.
  * @param {object} search parameters
  * @returns {Promise<IGradeDocument>} Returns a Promise of the user.
  */
  findOrCreate: (query: Object): Promise<IGradeDocument> => {
    Grade.ensureIndexes(function (err) {
      if (err) return console.log(err);
    });
    return Grade.findOne(query).exec()
      .then((grade) => {
        if (grade) {
          return grade;
        } else {
          return Grade.create(query)
            .then((grade) => {
              return grade.save();
            })
            .catch((err) => { logger.info(err); });
        }
      });
  },

  /**
  * Finds a Grade and updates it, or creates the Grade if it does not exist.
  * @param {ICourseDocument} search parameters
  * @returns {Promise<IGradeDocument>} Returns a Promise of the user.
  */
  createOrUpdate: (query: IGradeDocument): Promise<IGradeDocument> => {
    return Grade.findOne({
      snum: query.snum,
      deliv: query.deliv,
    })
      .then((grade) => {
        if (grade) {
          grade.details = query.details;
          return grade.save();
        } else {
          return Grade.create(query)
            .then((grade) => {
              return grade.save();
            })
            .catch((err) => { logger.info(err); });
        }
      });
  },
});



const Grade: IGradeModel = <IGradeModel>mongoose.model('Grade', GradeSchema);

export { IGradeDocument, IGradeModel, Grade, GradeSchema };
