import { logger } from '../../../utils/logger';
import { config } from '../../../config/env';

let rp = require('request-promise-native');

class GithubManager {
  private GITHUB_AUTH_TOKEN: string = config.github_callback_url;
  private GITHUB_USER_NAME: string = config.github_callback_url;
  private DELAY_SEC: number = 5000; // I will try to avoid using this for simplicity.
  private orgName: string;

  constructor(orgName: string) {
    this.orgName = orgName;
  }

  public createTeam(teamName: string, permission: string): Promise<Object> {
    let GithubManager = this;

    logger.info('GithubManager::createTeam(..) - start');
    return new Promise(function (fulfill, reject) {
      console.log('auth token' + GithubManager.GITHUB_AUTH_TOKEN);
      console.log('username' + GithubManager.GITHUB_USER_NAME);
      let options = {
        'method': 'POST',
        'uri': 'https://api.github.com/orgs/' + GithubManager.orgName + '/teams',
        'headers': {
          'Authorization': GithubManager.GITHUB_AUTH_TOKEN,
          'User-Agent': GithubManager.GITHUB_USER_NAME,
          'Accept': 'application/json',
        },
        'body': {
          'name': teamName,
          'permission': permission,
        },
        'json': true,
      };

      rp(options).then( (body: any) => {
        let id = body.id;
        logger.info('GithubManager::createTeam(..) - success: ' + id + '.');
        fulfill({ 'teamName': teamName, 'teamId': id });
      }).catch( (err: any) => {
        logger.info('GithubManager::createTeam(..) - ERROR: ' + err + '.');
        reject(err);
      });
    });
  }
}

Object.seal(GithubManager);

export { GithubManager } ;