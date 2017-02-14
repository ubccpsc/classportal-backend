import * as mongoose from 'mongoose';

interface IDeliverableDocument extends mongoose.Document {
  courseId: string;
  deliverableId: string;
  description: string;
  url: string;
  isTeam: boolean;
  isUploaded: boolean;
  openDate: string;
  dueDate: string;
  gradeReleaseDate: string;
  gradingScheme: string[];
}

interface IDeliverableModel extends mongoose.Model<IDeliverableDocument> {
}

const DeliverableSchema = new mongoose.Schema({
  courseId: {
    type: String,
    required: true,
  },
  deliverableId: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  url: {
    type: String,
  },
  isTeam: {
    type: Boolean,
    default: false,
  },
  isUploaded: {
    type: Boolean,
    required: false,
  },
  openDate: {
    type: Date,
  },
  dueDate: {
    type: Date,
  },
  gradeReleaseDate: {
    type: Date,
  },
  gradingScheme: {
    type: [String],
  },
});

DeliverableSchema.static({
});

const Deliverable: IDeliverableModel = <IDeliverableModel>mongoose.model('Deliverable', DeliverableSchema);

export { IDeliverableDocument, IDeliverableModel, Deliverable };
