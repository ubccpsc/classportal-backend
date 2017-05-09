import * as mongoose from 'mongoose';

export interface GroupCommit extends mongoose.Document {
  repoName: string;
  sha: string;
}