import * as mongoose from 'mongoose';

interface IGradeDocument extends mongoose.Document {
  courseId: string;
  deliverableId: string;
  username: string;
  gradingScheme: any[];
}

interface IGradeModel extends mongoose.Model<IGradeDocument> {
}

const GradeSchema = new mongoose.Schema({
  courseId: {
    type: String,
    required: true,
  },
  deliverableId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  gradingScheme: {
    type: [Object],
  },
});

const Grade: IGradeModel = <IGradeModel>mongoose.model('Grade', GradeSchema);

export { IGradeDocument, IGradeModel, Grade };
