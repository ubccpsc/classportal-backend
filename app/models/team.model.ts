import * as mongoose from 'mongoose';
import {logger} from '../../utils/logger';
import {User, IUserDocument} from '../models/user.model';
import {Deliverable, IDeliverableDocument} from '../models/deliverable.model';
import {
  GithubState, GithubRepo, GithubTeam, defaultGithubState, GithubCreationRecord,
  defaultGithubRepo
} from './github.interfaces';

interface ITeamDocument extends mongoose.Document {
  course: Object;
  teamId: number;
  members: IUserDocument[];
  deliverable: Object;
  deliverableId: IDeliverableDocument;
  deliverableIds: IDeliverableDocument[];
  name: string;
  teamUrl: string;
  labSection: string;
  disbanded: boolean;
  githubOrg: string;
  githubState: GithubState;
  TAs: Object[];
}

interface ITeamModel extends mongoose.Model<ITeamDocument> {
  findByUsername(username: string): Promise<ITeamDocument>;
  findOrCreate(query: Object): Promise<ITeamDocument>;
}

const TeamSchema = new mongoose.Schema({
  name:                 {
    type:     String,
    required: true,
  },
  labSection: {
    type:     String
  },
  githubOrg:            {
    type:    String,
    default: null,
  },
  teamUrl:            {
    type: String,
  },
  githubTeamId:         {
    type: Number,
  },
  multiDeliverableRepo: {
    type: Boolean,
  },
  repoId:               {
    type: Number,
  },
  disbanded:            {
    type: Boolean,
    default: false,
  },
  courseId:             {
    type:     mongoose.Schema.Types.ObjectId, ref: 'Course',
    required: true,
  },
  deliverableId:        {
    type: mongoose.Schema.Types.ObjectId, ref: 'Deliverable',
  },
  deliverableIds:       [
    {type: mongoose.Schema.Types.ObjectId, ref: 'Deliverable'}
  ],
  members:              {
    type:    [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    default: [],
  },
  TAs:                  {
    type: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  },
  githubState:          {
    type: Object,
    default: {
      repo: {
        url:        {type: String, default: ''},
        id:         {type: Number, default: 0},
        name:       {type: String, default: ''},
        webhookId:  {type: Number, default: 0},
        webhookUrl: {type: String, default: ''},
      },
      team: {
        id: {type: Number, default: 0}
      },
      creationRecord: {
        type: Object,
        default: {
          error: {type: Object, default: new Error()}
        }
      }
    }
  },
});

// Methods
TeamSchema.method({});

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
            .then((q) => {
              return q.save();
            })
            .catch((err) => {
              logger.info(err);
            });
        }
      });
  },
});

const Team: ITeamModel = <ITeamModel>mongoose.model('Team', TeamSchema);

export {ITeamDocument, ITeamModel, Team};
