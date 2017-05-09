import * as mongoose from 'mongoose';

// Represents a complete team that has been formed.
export interface GroupRepoDescription extends mongoose.Document {
  team: number;           // team number (used internally by portal)
  members: string[];      // github usernames
  url?: string;           // github url (leave undefined if not set)
  projectName?: string;   // github project name
  teamName?: string;      // github team name
  teamIndex?: number;
}