import * as mongoose from 'mongoose';
import { logger } from '../../utils/logger';

interface IProjectDocument extends mongoose.Document {
  course: Object;
  ProjectId: number;
  members: Object[];
  deliverable: Object;
  name: string;
  member: string;
  repo: string;
  labId: string;
  githubUrl: string;
  githubOrg: string;
  githubProjectId: number;
  TAs: Object[];
}

interface IProjectModel extends mongoose.Model<IProjectDocument> {
}

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  githubOrg: {
    type: String,
    default: null,
  },
  labId: {
    type: String,
  },
  githubUrl: {
    type: String,
  },
  githubProjectId: {
    type: Number,
  },
  repo: {
    type: String,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Course',
    required: true,
  },
  deliverableId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Deliverable',
  },
  member: {
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

});

const Project: IProjectModel = <IProjectModel>mongoose.model('Project', ProjectSchema);

export { IProjectDocument, IProjectModel, Project };
