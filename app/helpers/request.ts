import fetch, {Response} from 'node-fetch';
import {config} from '../../config/env';

function retrieveAccessToken(authcode: string): Promise<any> {
  return fetch('https://github.com/login/oauth/access_token', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body:    JSON.stringify({
      client_id:     config.github_client_id,
      client_secret: config.github_client_secret,
      code:          authcode,
    }),
  })
    .then((res: Response) => res.json())
    .then((res: any) => {
      const accessToken: string = res.accessToken;
      return accessToken
        ? Promise.resolve(accessToken)
        : Promise.reject('Error getting access token!');
    });
}

function retrieveUsername(token: any): Promise<any> {
  return fetch('https://api.github.com/user', {
    method:  'GET',
    headers: {
      'Content-Type':  'application/json',
      'User-Agent':    'ClasslistPortal-Student',
      'Authorization': 'token ' + token,
    },
  })
    .then((res: Response) => res.json())
    .then((res: any) => {
      const username: string = res.login;
      return username
        ? Promise.resolve(username)
        : Promise.reject('Error getting username!');
    });
}

export {retrieveAccessToken, retrieveUsername};
