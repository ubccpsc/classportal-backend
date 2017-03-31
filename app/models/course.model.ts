import * as mongoose from 'mongoose';

interface ICourseDocument extends mongoose.Document {
  courseId: string;
  minTeamSize: number;
  maxTeamSize: number;
  modules: string[];
  customData: any;
  classList: Object[];
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
    type: [Object],
  },
  customData: {
    type: Object,
  },
});

const Course: ICourseModel = <ICourseModel>mongoose.model('Course', CourseSchema);

export { ICourseDocument, ICourseModel, Course };
