import { logger } from '../../../utils/logger';
import { config } from '../../../config/env';

let rp = require('request-promise-native');

class GithubManager {
  private GITHUB_AUTH_TOKEN = config.github_auth_token;
  private GITHUB_USER_NAME = config.github_user_name;
  private DELAY_SEC: number = 5000; // Used due to a callback on the github api returning too early
  private orgName: string;

  constructor(orgName: string) {
    this.orgName = orgName;
  }

  public createTeam(teamName: string, permission: string): Promise<Object> {
    let ctx = this;
    logger.info('GithubManager::createTeam(..) - start');
    return new Promise(function (fulfill, reject) {
      let options = {
        'method': 'POST',
        'uri': 'https://api.github.com/orgs/' + ctx.orgName + '/teams',
        'headers': {
          'Authorization': 'token ' + ctx.GITHUB_AUTH_TOKEN,
          'User-Agent': ctx.GITHUB_USER_NAME,
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