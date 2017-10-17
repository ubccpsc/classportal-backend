export interface TeamPayloadContainer {
  response: TeamPayload;
}

export interface TeamPayload {
  noTeam: Student[];
  teams: TeamRow[];
}

export interface Student {
  lname: string;
  fname: string;
  username: string;
  profileUrl: string;
}

export interface TeamRow {
  labSection: string;
  name: string;
  teamUrl: string;
  members: Student[];
}

