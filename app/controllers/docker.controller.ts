import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import {ICourseDocument, Course} from '../models/course.model';
import {IUserDocument, User, CourseData} from '../models/user.model';
import {IDeliverableDocument, Deliverable} from '../models/deliverable.model';
import {logger} from '../../utils/logger';
import {config} from '../../config/env';
import {Helper} from "../github/util";
import {log} from 'util';
import {ENOLCK} from 'constants';

const DOCKER_PREPEND = 'autotest/cpsc';
const DOCKER_APPEND = '__bootstrap';
const GIT_CLONE_PREPEND = 'git clone';
const tmp = require('tmp-promise');
const exec = require('child-process-promise').exec;


/**
 * Builds a Docker container if the container meets criteria:
 * 
 *    CRITERIA: 
 *    - Dockerfile in repo that can be cloned using Git key
 *    - Dockerfile must not fail
 *      
 *      Warning: We set these conditions that may lead to Dockerfile failing:
 * 
 *      #1. set -o errexit  # exit on command failure
 *      #2. set -o pipefail # exit if any command in pipeline fails
 *      #3. set -o nounset  # exit if undeclared variable is used
 *
 *    INFO: 
 *    - Container tagged on server using the example format 'cpsc310__d9__bootstrap'
 *    - Build script injects AutoTest environment variables during build: 
 * 
 *       --build-arg testsuiteCommit=${testsuiteCommit} \
 *       --build-arg allowDNS=${allowDNS} \
 *       --build-arg externalServers="${externalServers}" \
 *       --build-arg isContainerLive=1 \
 *       --build-arg deliverable="${deliverable}" \
 *       --build-arg githubKey="${githubKey}" \
 *       --no-cache \ 
 * 
 * @param payload.courseId string ie. '310'
 * @param payload.deliverableName string ie. 'd2', 'p53' or undefined
 * @return User[] A list of admins
 */
async function buildContainer(payload: any): Promise<any> {
  let that = this;
  let tempDir = await tmp.dir({dir: '/recycling', unsafeCleanup: true});
  let tempPath = tempDir.path;
  let deliv: IDeliverableDocument;
  let course: ICourseDocument;
  let tagName: string;
  const DOCKERFILE_NAME: string = 'Dockerfile';

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
      if (typeof payload.deliverableName !== 'undefined') {
        return Deliverable.findOne({courseId: course._id, name: payload.deliverableName})
        .then((_deliv: IDeliverableDocument) => {
          if (_deliv) {
            deliv = _deliv;
            return deliv;
          }
          throw `Could not find Deliverable ${payload.deliverableName} under ${payload.courseId}`;
        });
      } else {
        return deliv = null;
      }
    })
    .then(() => {
      // SECOND: Based on Course and Deliv info, create Docker tag name and Github clone repo string
      let githubRepoUrl: string;
      let dockerKey: string;
      console.log('test', typeof payload.deliverableName === 'undefined');
      if (typeof payload.deliverableName === 'undefined') {
        dockerKey = course.dockerKey || '';
        tagName = DOCKER_PREPEND + course.courseId + DOCKER_APPEND;
        githubRepoUrl = Helper.addGithubAuthToken(course.dockerRepo, dockerKey);
        return githubRepoUrl;
      } else {
        dockerKey = deliv.dockerKey !== '' ? deliv.dockerKey : '';
        tagName = DOCKER_PREPEND + course.courseId + '__' + deliv.name + DOCKER_APPEND;
        githubRepoUrl = Helper.addGithubAuthToken(deliv.dockerRepo, dockerKey);
        return githubRepoUrl;
      }
    })
    .then((githubRepoUrl: string) => {
      // THIRD: Clone repo and return fileIndex to send to User in UI.
      return cloneRepo(githubRepoUrl, tempPath)
        .then(() => {
          return new Promise((fulfill, reject) => {
            let filesystem = require('fs');
            fs.readdir(tempPath, function(err: any, fileIndex) {
              if (err) {
                logger.error('DockerController::raiseContainer() cloneRepo()' + err);
                reject(err);
              }
              logger.info('DockerController::raiseContainer() Cloned Repo File Index: ', fileIndex);
              fulfill(fileIndex);
            });
          });
        });
    })
    .then((fileIndexArr: string[]) => {
      // FOURTH: Check that files exist in cloned repo and ensure that Dockerfile exists
      let dockerFileExists: boolean = false;
      let capsFileIndexArr: string[] = [];
      if (fileIndexArr.length === 0) {
        throw `Could not find any files in repository.`;
      }

      fileIndexArr.map((file) => {
        if (file === DOCKERFILE_NAME) {
          dockerFileExists = true;
        }
      });

      if (dockerFileExists) {
        logger.info('DockerController::raiseContainer() SUCCESS - Dockerfile found - Starting build');
        return fileIndexArr;
      } else {
        throw `Dockerfile does not exist in the repository. ` + 
          `See implementation guide onto how to build containers.`;
      }
    })
    .then((fileIndexArr: string[]) => {
      // FIFTH: RUN docker-build-helper.sh to create and tag docker image ready for AutoTest
      let delivInput = typeof payload.deliverableName === 'undefined' ? 0 : payload.deliverableName;
      let envInput = config.env === 'production' ? 1 : 0;
      let githubToken = String(config.github_auth_token).replace('token ', '');
      let appPath = String(__dirname).replace('build/app/controllers', '');

      if (typeof payload.deliverableName !== 'undefined') {
        deliv.dockerInProgress = true;
        deliv.save();
      } else {
        course.dockerInProgress = true;
        course.save();
      }

      return exec(`${appPath}app/helpers/docker-build-helper.sh ${tempPath} ${githubToken} ${course.courseId} ${delivInput} ` +
        `${envInput} ${config.app_path}:1${course.courseId}/`)
          .then(function (result: any) {
            logger.info('DockerController:: Building Container STDOUT/STDERR:');
            logger.info('DockerController:: Building Container STDOUT:' + result.stdout);
            logger.info('DockerController:: Building Container STDERR:' + result.stderr);
            return {stderr: result.stderr, stdout: result.stdout};
            })
            .then((resultFile: any) => {
              console.log('DockerController:: Building Container SUCCESS ', resultFile);
              if (typeof payload.deliverableName !== 'undefined') {
                deliv.dockerLog = resultFile;
                deliv.dockerInProgress = false;
                deliv.save();
              } else {
                course.dockerLog = resultFile;
                course.dockerInProgress = false;
                course.save();
              }
              tempDir.cleanup();
            })
            .catch((err: any) => {
              if (typeof payload.deliverableName !== 'undefined') {
                deliv.dockerLog = err;
                deliv.dockerInProgress = false;
                deliv.save();
              } else {
                course.dockerLog = err;
                course.dockerInProgress = false;
                course.save();
              }
              tempDir.cleanup();
              console.log('DockerController:: Building Container ERROR ' + err);
            });
            // console.log('GithubManager::cloneRepo stderr: ' + stderr);
    })
    .catch((err) => {
      console.log('error', err);
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
 * @param repoUrl String Github Repo url ie. https://github.com/andrew/repoName
 * @param tempPath String the temp path to clone the repo in.
 */
function cloneRepo(repoUrl: string, tempPath: string) {
  logger.info('GithubManager::cloneRepo() begins');

  return exec(`git clone ${repoUrl} ${tempPath}`)
    .then(function (result: any) {
      logger.info('GithubManager::cloneRepo STDOUT/STDERR:');
      console.log('stdoutSOMETHING: ', result.stdout);
      console.log('stderr: ', result.stderr);
      return result;
    });
}



export {
  buildContainer, dropContainer
};
