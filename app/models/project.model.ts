import * as mongoose from 'mongoose';
import { logger } from '../../utils/logger';

interface IProjectDocument extends mongoose.Document {
  student: Object;
  deliverableId: string;
  repoId: string;
  labId: string;
  githubUrl: string;
  githubOrg: string;
  githubProjectId: number;
  TAs: Object[];
}

interface IProjectModel extends mongoose.Model<IProjectDocument> {
}

const ProjectSchema = new mongoose.Schema({
  githubOrg: {
    type: String,
    default: null,
  },
  labId: {
    type: String,
  },
  name: {
    type: String,
  },
  githubUrl: {
    type: String,
  },
  githubProjectId: {
    type: Number,
  },
  githubRepoId: {
    type: Number,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Course',
  },
  deliverableId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Deliverable',
  },
  student: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User',
  },
  TAs: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
});


// Methods
ProjectSchema.method({
});

// Statics
ProjectSchema.static({
  /**
  * Find a team by object ID. If does not exist, then team is created in DB.
  * @param {object} recommended courseId
  * @returns {Promise<ITeamDocument>} Returns a Promise of the user.
  */
  test: (query: Object): Promise<IProjectDocument> => {
    return Project
      .findOne(query)
      .exec()
      .then((team) => {
        if (team !== null) {
          return Promise.resolve(team);
        } else {
          return Project.create(query)
            .then((q: any) => { return q.save(); })
            .catch((err: any) => { logger.info(err); });
        }
      });
  },
});

const Project: IProjectModel = <IProjectModel>mongoose.model('Project', ProjectSchema);

export { IProjectDocument, IProjectModel, Project };

