export interface DeliverablePayload {
  _id: string;
  id: string;
  open: number; // timestamp
  close: number; // timestamp
  markInBatch: boolean;
  teamsInSameLab: boolean;
  studentsMakeTeams: boolean;
  solutionsUrl: string;
  solutionsKey: string;
  maxTeamSize: number;
  minTeamSize: number;
  dockerImage: string;
  dockerBuild: string;
  dockerOverride: boolean;
  containerBuilt: boolean;
  buildingRepos: boolean;
  gradesReleased: boolean;
  projectCount: number;
  url: string;
  deliverableKey: string;
  custom: object;
  customHtml: boolean;
  name: string;
}