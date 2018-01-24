import {ITeamDocument} from "../../models/team.model";

export interface ProvisionHealthCheckContainer {
  response: ProvisionHealthCheck;
}

export interface ProvisionHealthCheck {
  classSize: number;
  teamsAllowed?: boolean;
  numOfTeams: number;
  numOfTeamsWithRepo: object[];
  numOfTeamsWithoutRepo: object[];
  buildStats: object;
  studentsMakeTeams: boolean;
  studentTeamStatus: any;
  teams: ITeamDocument[];
}

export interface StudentTeamStatusContainer {
  studentsWithTeam: any[];
  studentsWithoutTeam: any[];
}