import * as mongoose from 'mongoose';
import { logger } from '../../utils/logger';
import { GithubState, GithubRepo, GithubTeam, defaultGithubState, 
  defaultGithubRepo } from './github.interfaces';

interface ITeamDocument extends mongoose.Document {
  course: Object;
  teamId: number;
  members: Object[];
  deliverable: Object;
  deliverableId: Object;
  deliverableIds: Object[];
  name: string;
  githubOrg: string;
  githubState: GithubState;

  TAs: Object[];
}

interface ITeamModel extends mongoose.Model<ITeamDocument> {
  findByUsername(username: string): Promise<ITeamDocument>;
  findOrCreate(query: Object): Promise<ITeamDocument>;
}

const TeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  githubOrg: {
    type: String,
    default: null,
  },
  githubUrl: {
    type: String,
  },
  githubTeamId: {
    type: Number,
  },
  multiDeliverableRepo: {
    type: Boolean,
  },
  repoId: {
    type: Number,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Course',
    required: true,
  },
  deliverableId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Deliverable',
  },
  deliverableIds: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Deliverable' }
  ],
  members: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  },
  TAs: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  githubState: {
    repo: {
      url: { type: String, default: '' },
      id: { type: Number, default: 0 },
      name: { type: String, default: '' },
    },
    team: {
      id: { type: Number, default: 0 }
    }
  },
});

// Methods
TeamSchema.method({
});

// Statics
TeamSchema.static({
  /**
  * Find a team by object ID. If does not exist, then team is created in DB.
  * @param {object} recommended courseId
  * @returns {Promise<ITeamDocument>} Returns a Promise of the user.
  */
  findOrCreate: (query: Object): Promise<ITeamDocument> => {
    return Team
      .findOne(query)
      .exec()
      .then((team) => {
        if (team !== null) {
          return Promise.resolve(team);
        } else {
          return Team.create(query)
            .then((q) => { return q.save(); })
            .catch((err) => { logger.info(err); });
        }
      });
  },
});

const Team: ITeamModel = <ITeamModel>mongoose.model('Team', TeamSchema);

export { ITeamDocument, ITeamModel, Team };
