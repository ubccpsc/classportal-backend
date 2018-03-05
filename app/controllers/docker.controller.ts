import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import {ICourseDocument, Course} from '../models/course.model';
import {IUserDocument, User, CourseData} from '../models/user.model';
import {IDeliverableDocument, Deliverable} from '../models/deliverable.model';
import {logger} from '../../utils/logger';
import {config} from '../../config/env';
import {Helper} from "../github/util";
import * as request from '../helpers/request';
import {log} from 'util';
import {ENOLCK} from 'constants';

const DOCKER_PREPEND = 'autotest/cpsc';
const DOCKER_APPEND = '__bootstrap';
const GIT_CLONE_PREPEND = 'git clone';
const tmp = require('tmp-promise');
const exec = require('child-process-promise').exec;

/**
 * Gets a list of users who are Admins underneath a particular course
 * @param payload.courseId string ie. '310'
 * @param payload.delivName string ie. 'd2', 'p53' or undefined
 * @return User[] A list of admins
 */
async function raiseContainer(payload: any): Promise<any> {
  let tempDir = await tmp.dir({dir: '/recycling', unsafeCleanup: true});
  let deliv: IDeliverableDocument;
  let course: ICourseDocument;
  let tagName: string;
  let githubRepoUrl: string;

  // FIRST: Get Course and Deliv info
  return Course.findOne({courseId: payload.courseId})
    .then((_course: ICourseDocument) => {
      if (_course) {
        course = _course;
        return course;
      }
      throw `Could not find Course ${payload.courseId}`;
    })
    .then(() => {
      if (typeof payload.delivName !== 'undefined') {
        return Deliverable.findOne({courseId: course._id, name: payload.delivName})
        .then((_deliv: IDeliverableDocument) => {
          if (_deliv) {
            deliv = _deliv;
            return deliv;
          }
          throw `Could not find Deliverable ${payload.delivName} under ${payload.courseId}`;
        });
      } else {
        deliv = null;
        return null;
      }
    })
    .then(() => {
      // SECOND: Based on Course and Deliv info, create Docker tag name and Github clone repo string
      if (deliv === null) {
        tagName = DOCKER_PREPEND + course.courseId + DOCKER_APPEND;
        githubRepoUrl = Helper.addGithubAuthToken(course.dockerRepo, course.dockerKey || config.github_auth_token);
      } else {
        tagName = DOCKER_PREPEND + course.courseId + '__' + deliv.name + DOCKER_APPEND;
        githubRepoUrl = Helper.addGithubAuthToken(deliv.dockerRepo, deliv.dockerKey || '');

      }
      return tagName;
    });
}

/**
 * Gets a list of users who are Admins underneath a particular course
 * @param payload.courseId string ie. '310'
 * @param payload.delivName string ie. 'd2', 'p53'
 * @return User[] A list of admins
 */
function dropContainer(payload: any) {
  return new Promise((fulfill, reject) => {
    return;
  });
}

/**
 * Clones a Github repo somewhere on the FS specified by temp path dir.
 * 
 * @param importRepo String Github Repo url ie. https://github.com/andrew/repoName
 * @param githubKey String Github auth token produced in Github user settings.
 * @param tempPath String the temp path to clone the repo in.
 */
function cloneRepo(repoUrl: string, tempPath: string) {
  logger.info('GithubManager::cloneRepo() begins');

  return exec(`git clone ${repoUrl} ${tempPath}`)
    .then(function (result: any) {
      logger.info('GithubManager::cloneRepo STDOUT/STDERR:');
      console.log('stdoutSOMETHING: ', result.stdout);
      console.log('stderr: ', result.stderr);
    });
}



export {
  raiseContainer, dropContainer
};
