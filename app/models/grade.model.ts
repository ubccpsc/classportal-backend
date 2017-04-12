import * as mongoose from 'mongoose';
import { logger } from '../../utils/logger';


interface IGradeDocument extends mongoose.Document {
  courseId: string;
  deliverableId: string;
  username: string;
  gradingScheme: any[];
}

interface IGradeModel extends mongoose.Model<IGradeDocument> {
  findOrCreate(query: Object): Promise<IGradeDocument>;
}

const GradeSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Course',
  },
  deliverableId: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Deliverable' }],
  },
  username: {
    type: String,
    required: true,
  },
  gradingScheme: {
    type: [Object],
  },
});

GradeSchema.static({

    /**
  * Find a Deliverable by object query. If doesn't exist, creates it based on object query and returns it.
  * @param {object} search parameters
  * @returns {Promise<IGradeDocument>} Returns a Promise of the user.
  */
  findOrCreate: (query: Object): Promise<IGradeDocument> => {
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
});

const Grade: IGradeModel = <IGradeModel>mongoose.model('Grade', GradeSchema);

export { IGradeDocument, IGradeModel, Grade };
