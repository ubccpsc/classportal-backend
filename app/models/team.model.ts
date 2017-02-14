import * as mongoose from 'mongoose';

interface TeamMembers {
  username: string;
  fname: string;
  lname: string;
}

interface ITeamDocument extends mongoose.Document {
  courseId: string;
  teamId: string;
  members: TeamMembers[];
}

interface ITeamModel extends mongoose.Model<ITeamDocument> {
  findByUsername(username: string): Promise<ITeamDocument>;
}

const TeamSchema = new mongoose.Schema({
  courseId: {
    type: String,
    required: true,
  },
  teamId: {
    type: String,
    required: true,
  },
  members: {
    type: [
      {
        username: {
          type: String,
          required: true,
        },
        fname: {
          type: String,
          required: true,
        },
        lname: {
          type: String,
          required: true,
        },
      },
    ],
    required: true,
  },
});

// Methods
TeamSchema.method({
});

// Statics
TeamSchema.static({
});

const Team: ITeamModel = <ITeamModel>mongoose.model('Team', TeamSchema);

export { ITeamDocument, ITeamModel, Team };
