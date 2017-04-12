import * as mongoose from 'mongoose';
import { UserSchema } from '../models/user.model';

interface ICourseDocument extends mongoose.Document {
  courseId: string;
  minTeamSize: number;
  maxTeamSize: number;
  modules: string[];
  customData: any;
  classList: Object[];
  deliverables: Object[];
  grades: Object[];
  admins: string[];
}

interface ICourseModel extends mongoose.Model<ICourseDocument> {
  findByPlugin(customData: string): Promise<ICourseDocument>;
  findByCourseId(courseId: string): Promise<ICourseDocument>;
}

const CourseSchema: mongoose.Schema = new mongoose.Schema({
  courseId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    default: '',
    unique: false,
  },
  icon: {
    type: String,
    default: '//cdn.ubc.ca/clf/7.0.5/img/favicon.ico',
  },
  minTeamSize: {
    type: Number,
  },
  maxTeamSize: {
    type: Number,
  },
  modules: {
    type: [String],
  },
  classList: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  deliverables: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Deliverable' }],
  },
  grades: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Grade' }],
  },
  studentsSetTeams: {
    type: Boolean,
  },
  customData: {
    type: Object,
  },
  admins: {
    type: [String],
  },
});

const Course: ICourseModel = <ICourseModel>mongoose.model('Course', CourseSchema);

export { ICourseDocument, ICourseModel, Course };
