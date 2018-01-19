import * as mongoose from 'mongoose';
import {logger} from '../../utils/logger';
import {ITeamDocument} from './team.model';

const DEFAULT_MAX_TEAM_SIZE: number = 9999;
const DEFAULT_MIN_TEAM_SIZE: number = 1;

interface IDeliverableDocument extends mongoose.Document {
  courseId: string;
  name: string;
  url: string;
  open: number;
  close: number;
  projectCount: number;
  teamsInSameLab: boolean;
  studentsMakeTeams: boolean;
  maxTeamSize: number;
  minTeamSize: number;
  teamCount: number;
  gradesReleased: boolean;
  markInBatch: boolean;
  buildingRepos: boolean;
}

interface IDeliverableModel extends mongoose.Model<IDeliverableDocument> {
  findOrCreate(query: Object): Promise<IDeliverableDocument>;
}

const DeliverableSchema = new mongoose.Schema({
  courseId:       {
    type: mongoose.Schema.Types.ObjectId, ref: 'Course',
  },
  teamCount:      {
    type: Number,
  },
  markInBatch: {
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
  studentsMakeTeams: {
    type: Boolean,
    default: false,
  },
  buildingRepos: {
    type: Boolean,
    default: false,
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
  projectCount:   {
    type: Number,
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
      .then((deliverable) => {
        if (deliverable) {
          return deliverable;
        } else {
          return Deliverable.create(query)
            .then((d) => {
              return d.save();
            })
            .catch((err) => {
              logger.info(err);
            });
        }
      });
  },
});

const Deliverable: IDeliverableModel = <IDeliverableModel>mongoose.model('Deliverable', DeliverableSchema);

export {IDeliverableDocument, IDeliverableModel, Deliverable};
