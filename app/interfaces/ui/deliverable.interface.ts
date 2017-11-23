export interface DeliverablePayload {
  _id: string;
  id: string;
  open: number; // timestamp
  close: number; // timestamp
  markInBatch: boolean;
  teamsInSameLab: boolean;
  teamsAllowed: boolean;
  maxTeamSize: number;
  minTeamSize: number;
  buildingRepos: boolean;
  gradesReleased: boolean;
  projectCount: number;
  url: string;
  name: string;
}