import {DockerLogs} from '../../controllers/docker.controller';

export interface DeliverablePayload {
  _id: string;
  id: string;
  open: number; // timestamp
  close: number; // timestamp
  teamsInSameLab: boolean;
  studentsMakeTeams: boolean;
  solutionsUrl: string;
  solutionsKey: string;
  maxTeamSize: number;
  minTeamSize: number;
  rate: number;
  dockerImage: string;
  dockerBuild: string;
  dockerOverride: boolean;
  dockerKey: string;
  dockerRepo: string;
  containerBuilt: boolean;
  buildingContainer: boolean;
  dockerLogs: DockerLogs;
  buildingRepos: boolean;
  gradesReleased: boolean;
  regressionTest: boolean;
  regressionTests: string;
  whitelistedServers: string;
  projectCount: number;
  url: string;
  deliverableKey: string;
  custom: object;
  customHtml: boolean;
  name: string;
}