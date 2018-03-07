import * as mongoose from 'mongoose';
import {UserSchema, IUserDocument} from '../models/user.model';
import {DockerLogs} from '../controllers/docker.controller';
import {logger} from '../../utils/logger';

interface ICourseDocument extends mongoose.Document {
  courseId: string;
  custom: any;
  delivKey: string;
  solutionsKey: string;
  classList: Object[];
  dockerKey: string;
  dockerRepo: string;
  dockerInProgress: boolean;
  dockerLogs: DockerLogs;
  labSections: LabSection[];
  admins: IUserDocument[];
  staffList: IUserDocument[];
  urlWebhook: string;
  githubOrg: string;
  settings: CourseSettings;
}

// Interface helps with the front-end Class List View
export interface StudentWithLab {
  fname: string;
  lname: string;
  snum: string;
  csid: string;
  labSection: string;
}

export interface ClassListAndLab {
  labSections: LabSection[];
  classList: IUserDocument[];
}

export interface LabSection {
  labId: string;
  users: IUserDocument[];
}


export interface CourseSettings {
  bootstrapImage: string;
  testingDelay: boolean;
  delayTime: Date;
  markDelivsByBatch: boolean;
  deliverables: Object;
}

interface ICourseModel extends mongoose.Model<ICourseDocument> {
  findByCourseId(courseId: string): Promise<ICourseDocument>;
  findUsersInCourse(courseId: string): Promise<ICourseDocument[]>;
  createOrUpdate(course: ICourseDocument): Promise<ICourseDocument>;
}

const CourseSchema: mongoose.Schema = new mongoose.Schema({
  courseId:            {
    type:     String,
    required: true,
    unique:   true,
  },
  name:                {
    type:    String,
    default: '',
    unique:  false,
  },
  urlWebhook:          {
    type: String,
  },
  icon:                {
    type:    String,
    default: '//cdn.ubc.ca/clf/7.0.5/img/favicon.ico',
  },
  modules:             {
    type: [String],
  },
  classList:           {
    type: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  },
  grades:              {
    type: [{type: mongoose.Schema.Types.ObjectId, ref: 'Grade'}],
  },
  admins:              {
    type:    [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    default: [],
  },
  staffList:               {
    type:    [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    default: [],
  },
  labSections:         [
    {
      users: {
        type:    [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
        default: [],
      },
      labId: {
        type: String,
      },
    },
  ],
  custom:          {
    type: Object,
    default: {},
  },
  dockerRepo:       {
    type: String,
    default: '',
  },
  dockerKey:        {
    type: Object,
    default: '',
  },
  dockerInProgress: {
    type: Boolean,
    default: false,
  },
  dockerLogs: {
    type: Object,
    default: {},
  },
  githubOrg:           {
    type: String,
  },
  whitelistedServers:  {
    type: String,
    default: 'portal.cs.ubc.ca:1210 portal.cs.ubc.ca:1310 portal.cs.ubc.ca:1311',
  },
  settings:            {
    type: Object,
  },
  description:         {
    type: String,
  }, 
  delivKey:            {
    type: String,
    default: '',
  }, 
  solutionsKey:        {
    type: String,
    default: '',
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
      .findOne({'courseId': courseId})
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
            .catch((err) => {
              logger.info(err);
            });
        }
      });
  },
});

const Course: ICourseModel = <ICourseModel>mongoose.model('Course', CourseSchema);

export {ICourseDocument, ICourseModel, Course};
