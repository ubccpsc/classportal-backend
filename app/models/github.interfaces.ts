export interface GithubRepo {
  url: string;
  id: number;
  name: string;
}

export interface GithubState {
  repo: GithubRepo;
  team: GithubTeam;
}

export interface GithubTeam {
  id: number;
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

export const defaultGithubState = {
  repo: defaultGithubRepo,
  team: defaultTeam,
};
