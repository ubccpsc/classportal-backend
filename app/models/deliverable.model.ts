import * as mongoose from 'mongoose';
import {logger} from '../../utils/logger';
import {ITeamDocument} from './team.model';
import {DockerLogs} from '../controllers/docker.controller';

const DEFAULT_MAX_TEAM_SIZE: number = 1;
const DEFAULT_MIN_TEAM_SIZE: number = 1;

// # IMPORTANT: export interface DeliverablePayload also exists in the Deliverable.interface
// file. You must also update these fields.

interface IDeliverableDocument extends mongoose.Document {
  courseId: string;
  name: string;
  url: string;
  courseNum: string;
  deliverableKey: string;
  open: number;
  buildingContainer: boolean;
  close: number;
  dockerRepo: string;
  dockerKey: string;
  dockerLogs: DockerLogs;
  projectCount: number;
  teamsInSameLab: boolean;
  rate: number;
  studentsMakeTeams: boolean;
  whitelistedServers: string;
  solutionsUrl: string;
  solutionsKey: string;
  dockerImage: string;
  dockerBuild: string;
  dockerOverride: boolean;
  containerBuilt: boolean;
  maxTeamSize: number;
  minTeamSize: number;
  teamCount: number;
  gradesReleased: boolean;
  regressionTest: boolean;
  regressionTests: string;
  buildingRepos: boolean;
  customHtml: boolean;
  custom: object;
}

interface IDeliverableModel extends mongoose.Model<IDeliverableDocument> {
  findOrCreate(query: Object): Promise<IDeliverableDocument>;
}

const DeliverableSchema = new mongoose.Schema({
  courseId:       {
    type: mongoose.Schema.Types.ObjectId, ref: 'Course',
  },
  buildingContainer: {
    type: Boolean,
    default: false,
  },
  dockerLogs: {
    type: Object,
    default: {
      type: Object,
      default: { 
        type: Object,
        buildHistory: {
          stderr: '', stdout: ''
        },
        destroyHistory: {stderr: '', stdout: ''},
      },
    },
  },
  teamCount:      {
    type: Number,
  },
  courseNum: {
    type: Number,
  },
  dockerRepo: {
    type: String,
    default: '',
  },
  dockerKey: {
    type: String,
    default: '',
  },
  dockerImage: {
    type: String,
    default: '',
  },
  dockerBuild: {
    type: String,
    default: '',
  },
  containerBuilt: {
    type: Boolean,
    default: false,
  },
  dockerOverride: {
    type: Boolean,
    default: false,
  },
  teamsInSameLab: {
    type: Boolean,
    default: false,
  },
  maxTeamSize: {
    type: Number,
    default: DEFAULT_MAX_TEAM_SIZE,
  },
  minTeamSize: {
    type: Number,
    default: DEFAULT_MIN_TEAM_SIZE,
  },
  solutionsKey: {
    type: String,
    default: '',
  },
  solutionsUrl: {
    type: String,
    default: '',
  },
  studentsMakeTeams: {
    type: Boolean,
    default: false,
  },
  buildingRepos: {
    type: Boolean,
    default: false,
  },
  rate: {
    type: Number,
    default: 1 // in milliseconds aka. no delay
  },
  name:           {
    type: String,
    required: true,
  },
  githubOrg:      {
    type: String,
  },
  url:            {
    type: String,
  },
  deliverableKey: {
    type: String,
    default: '',
  },
  projectCount:   {
    type: Number,
  },
  regressionTest: {
    type: Boolean,
    default: false
  },
  regressionTests: {
    type: String,
    default: '',
  },
  whitelistedServers: {
    type: String,
    default: 'portal.cs.ubc.ca:1210 portal.cs.ubc.ca:1310 portal.cs.ubc.ca:1311'
  },
  team:           {
    type: mongoose.Schema.Types.ObjectId, ref: 'Team',
  },
  user:           {
    type: mongoose.Schema.Types.ObjectId, ref: 'User',
  },
  open:           {
    type: Number,
  },
  close:          {
    type: Number,
  },
  gradesReleased: {
    type: Boolean,
  },
  reposCreated:   {
    type:    Boolean,
    default: false,
  },
  customHtml: {
    type:    Boolean,
    default: false,
  },
  custom: {
    type:    Object,
    default: {},
  }
});

// Deliverable Name must be unique per Course
DeliverableSchema.index({courseId: 1, name: 1}, {unique: true});

DeliverableSchema.static({

  /**
   * Find a Deliverable by object query. If doesn't exist, creates it based on object query and returns it.
   * @param {object} search parameters
   * @returns {Promise<IDeliverableDocument>} Returns a Promise of the user.
   */
  findOrCreate: (query: Object): Promise<IDeliverableDocument> => {
    return Deliverable
      .findOne(query)
      .exec()
      .then((deliv) => {
        if (deliv) {
          return deliv;
        } else {
          return Deliverable.create(query)
            .then((deliv) => {
              return deliv.save();
            })
            .catch((err) => {
              logger.info(err);
            });
        }
      })
      .catch((err) => {
        logger.error('DeliverableModel::findOrCreate() ERROR' + err);
        return err;
      });
  },
});

const Deliverable: IDeliverableModel = <IDeliverableModel>mongoose.model('Deliverable', DeliverableSchema);

export {IDeliverableDocument, IDeliverableModel, Deliverable};
