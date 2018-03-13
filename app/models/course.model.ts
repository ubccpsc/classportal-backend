import * as mongoose from 'mongoose';
import {UserSchema, IUserDocument} from '../models/user.model';
import {DockerLogs} from '../controllers/docker.controller';
import {logger} from '../../utils/logger';

// Used to interface with Front-End 'classportal-ui' or raw Mongo queries
export interface CourseInterface {
  courseId: string; // ie. '310', '210'.
  githubOrg: string; // Github Enterprise Organization where student repos are located.
  dockerRepo: string; // The Repo where Dockerfile builds image from
  dockerKey: string; // Github auth token key if Repo is not public
  labSections: LabSection[]; // Array that holds the lab sections with the students
  urlWebhook: string; // The Portal address and port that a ResultRecord should be sent to after internal Docker Grading.
  admins: IUserDocument[]; // Mongo Object ID / Professors only. TAs with staff priviledges must go under staff list. Only SuperAdmin can add admins
  staffList: IUserDocument[]; // Mongo Object ID / TAs who can do unlimited Grade Requests and access areas of ClassPortal
  classList: IUserDocument[]; // Mongo Object ID / Every student who is enrolled in the course should be in this list
  dockerLogs: DockerLogs; // Latest Docker build and drop logs for this Course
  buildingContainer: boolean; // If currently building a container, this should be true.
  whitelistedServers: string; // Comma dilineated IP/DNS:PORT
}

interface ICourseDocument extends mongoose.Document {
  courseId: string;
  buildingContainer: boolean;
  classList: Object[];
  dockerKey: string;
  dockerRepo: string;
  dockerLogs: DockerLogs;
  dockerImage: string;
  labSections: LabSection[];
  admins: IUserDocument[];
  staffList: IUserDocument[];
  urlWebhook: string;
  githubOrg: string;
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

interface ICourseModel extends mongoose.Model<ICourseDocument> {
  createOrUpdate(course: ICourseDocument): Promise<ICourseDocument>;
}

const CourseSchema: mongoose.Schema = new mongoose.Schema({
  courseId:            {
    type:     String,
    required: true,
    unique:   true,
  },
  buildingContainer:   {
    type:     Boolean,
    default:  false,
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
  dockerImage:      {
    type: String,
    default: '',
  },
  dockerRepo:       {
    type: String,
    default: '',
  },
  dockerKey:        {
    type: Object,
    default: '',
  },
  dockerLogs: {
    type: Object,
    default: {
      buildHistory: '',
      destroyHistory: '',
    },
  },
  githubOrg:           {
    type: String,
  },
  whitelistedServers:  {
    type: String,
    default: 'portal.cs.ubc.ca:1210 portal.cs.ubc.ca:1310 portal.cs.ubc.ca:1311',
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
}, {minimize: false});

CourseSchema.static({

  /**
   * Finds a Course and updates it or creates it if it does not exist.
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
