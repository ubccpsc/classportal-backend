import * as mongoose from 'mongoose';
import { UserSchema } from '../models/user.model';
import { logger } from '../../utils/logger';

interface ICourseDocument extends mongoose.Document {
  courseId: string;
  minTeamSize: number;
  maxTeamSize: number;
  modules: string[];
  customData: any;
  classList: Object[];
  deliverables: Object[];
  grades: [Object];
  admins: [Object];
  teamMustBeInSameLab: Boolean;
  settings: CourseSettings;
}

interface CourseSettings {
  bootstrapImage: string;
  testingDelay: boolean;
  delayTime: Date;
  markDelivsByBatch: boolean;
  deliverables: Object;
}

interface ICourseModel extends mongoose.Model<ICourseDocument> {
  findByPlugin(customData: string): Promise<ICourseDocument>;
  findByCourseId(courseId: string): Promise<ICourseDocument>;
  findUsersInCourse(courseId: string): Promise<ICourseDocument[]>;
  createOrUpdate(course: ICourseDocument): Promise<ICourseDocument>;
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
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  },
  teamMustBeInSameLab: {
    type: Boolean,
  },
  settings: {
    type: Object,
  },
  description: {
    type: String,
  },
});

CourseSchema.static({

    /**
  * Gets a list of Users in the course.classList object.
  * @param {string} search parameters
  * @returns {Promise<IUserDocument>} Returns a Promise of the user.
  */
  findUsersInCourse: (courseId: string): Promise<ICourseDocument> => {
    return Course
      .findOne({ 'courseId' : courseId })
      .populate('classList')
      .exec()
      .then((course) => {
        if (course) {
          return course;
        } else {
          logger.info('findUsersInCourse(): Course #' + courseId + ' not found.');
          return Error('findUsersInCourse(): Course #' + courseId + ' not found.');
        }
      });
  },

  /**
  * Finds a Grade and updates it, or creates the Grade if it does not exist.
  * @param {ICourseDocument} search parameters
  * @returns {Promise<ICourseDocument>} Returns a Promise of the user.
  */
  createOrUpdate: (query: ICourseDocument): Promise<ICourseDocument> => {
    return Course.findOne(query).exec()
      .then((course) => {
        if (course) {
          course = query;
          return course.save();
        } else {
          return Course.create(query)
            .then((course) => {
              return course.save();
            })
            .catch((err) => { logger.info(err); });
        }
      });
  },
});



const Course: ICourseModel = <ICourseModel>mongoose.model('Course', CourseSchema);

export { ICourseDocument, ICourseModel, Course };
