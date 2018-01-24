import {ITeamDocument} from "../../models/team.model";

export interface ProvisionHealthCheckContainer {
  response: ProvisionHealthCheck;
}

export interface ProvisionHealthCheck {
  classSize: number;
  teamsAllowed: boolean;
  numOfTeams: number;
  numOfTeamsWithRepo: object[];
  numOfTeamsWithoutRepo: object[];
  studentTeamStatus: StudentTeamStatusContainer;
  teams: ITeamDocument[];
}

export interface StudentTeamStatusContainer {
  studentsWithTeam: object[];
  studentsWithoutTeam: object[];
}