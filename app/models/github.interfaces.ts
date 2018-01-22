export interface GithubRepo {
  url: string;
  id: number;
  name: string;
}

export interface GithubState {
  repo: GithubRepo;
  team: GithubTeam;
  creationRecord: GithubCreationRecord;
}

export interface GithubTeam {
  id: number;
}

export interface GithubCreationRecord {
  error: object; // Error object thrown from Github
}

export const defaultGithubRepo = {
  url:        '',
  id:         0,
  name:       '',
  webhookId:  0,
  webhookUrl: '',
};

export const defaultTeam = {
  id: 0,
};

export const defaultCreationRecord: GithubCreationRecord = {
  error: {},
};

export const defaultGithubState = {
  repo: defaultGithubRepo,
  team: defaultTeam,
  creationRecord: defaultCreationRecord
};
