export interface GithubRepo {
  url: string;
  id: number;
  name: string;
}

export interface GithubState { 
  repo: GithubRepo;
}

export const defaultGithubRepo = {
    url: '',
    id: 0,
    name: '',
  };

export const defaultGithubState = {
    repo: defaultGithubRepo,
  };

