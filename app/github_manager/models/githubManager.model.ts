import { logger } from '../../../utils/logger';
import { config } from '../../../config/env';

let rp = require('request-promise-native');

class GithubManager {
  private GITHUB_AUTH_TOKEN = config.github_auth_token;
  private GITHUB_USER_NAME = config.github_user_name;
  private readonly DELAY_SEC: number = 5000; // Used due to a callback on the github api returning too early
  private orgName: string;

  private readonly POST = 'POST';
  private readonly PUT = 'PUT';
  private readonly GET = 'GET';
  private readonly PATCH = 'PATCH';
  private readonly DELETE = 'DELETE';

  constructor(orgName: string) {
    this.orgName = orgName;
  }

  /**
  * Configures request object for rp() method.
  * @param {string} PUT, POST, etc.
  * @param {object} Body payload of a request.
  * @returns {object} options object to submit in a request
  */
  private setPayloadOptions(httpMethod: string, body: object) {
    let ctx = this;
    let options: any = {
      'method': httpMethod,
      'uri': 'https://api.github.com/orgs/' + ctx.orgName + '/teams',
      'headers': {
        'Authorization': 'token ' + ctx.GITHUB_AUTH_TOKEN,
        'User-Agent': ctx.GITHUB_USER_NAME,
        'Accept': 'Accept: application/vnd.github.v3+json',
      },
      'json': true,
    };
    options.body = body;
    return options;
  }

  /**
  * Creates a Github Team -- 'closed' team-type by default
  * @param {string} Team name of Team Model object
  * @param {privacy} only 'secret' or 'closed' options available.
  * @param {[string]} array of strings in org/repo_name format for team (optional)
  * @returns {Promise<object>|Promise<Error>} options object to submit in a request
  */
  public createTeam(teamName: string, privacy: string = 'closed', repoNames: [string]): Promise<Object|Error> {
    let ctx = this;
    logger.info('GithubManager::createTeam(..) - start');
    return new Promise(function (fulfill, reject) {
      let body = {
        'name': teamName,
        'privacy': privacy,
        'repo_names': new Array,
      };
      if (repoNames.length > 0) {
        body.repo_names = repoNames;
      }

      let options = ctx.setPayloadOptions(ctx.POST, body);

      rp(options).then( (body: any) => {
        let id = body.id;
        logger.info('GithubManager::createTeam(..) - success: ' + id + '.');
        fulfill({ 'teamName': teamName, 'teamId': id });
      }).catch( (err: Error) => {
        logger.info('GithubManager::createTeam(..) - ERROR: ' + err + '.');
        reject(err);
      });
    });
  }
}

Object.seal(GithubManager);

export { GithubManager } ;