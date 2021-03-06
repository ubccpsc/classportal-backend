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

const GET_CONTAINER_LIST_CMD = 'docker images';
const APP_PATH = String(__dirname).replace('build/app/controllers', '');

export interface DockerLogs {
  buildHistory: string;
  destroyHistory: string;
}

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
 *      --build-arg isContainerLive="${isContainerLive}" \
 *      --build-arg deliverable="${deliverable}" \
 *      --build-arg githubKey="${githubKey}" \
 *      --no-cache \
 * 
 * @param payload.courseId string ie. '310'
 * @param payload.deliverableName string ie. 'd2', 'p53' or undefined
 * @return User[] A list of admins
 */
async function buildContainer(payload: any): Promise<any> {
  let that = this;
  let tempDir = await tmp.dir({dir: '/tmp', unsafeCleanup: true});
  let tempPath = tempDir.path;
  let deliv: IDeliverableDocument;
  let githubRepoUrl: string;
  let course: ICourseDocument;
  let tagName: string;

  // On each build, we clear out the logs and start from scratch
  let dockerLogs: DockerLogs = {
    buildHistory: '',
    destroyHistory: '',
  };

  const DOCKERFILE_NAME: string = 'Dockerfile';
  return new Promise((fulfill, reject) => {

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
        let dockerKey: string;
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
      .then(() => {
        // THIRD: Abort build if the container is already built or buildingContainer === true;
        return exec(GET_CONTAINER_LIST_CMD)
          .then((process: any) => {
            if (String(process.stdout).indexOf(tagName) > -1) {
              throw `Container ${tagName} already built. Aborting build.`;
            }
            if (typeof payload.deliverableName === 'undefined') {
              if (course.buildingContainer) {
                throw `Container ${tagName} is already being built. Aborting this build.`;
              }
            } else if (deliv.buildingContainer) {
              throw `Container ${tagName} is already being built. Aborting this build.`;
            }
          });
      })
      .then(() => {
        // FOURTH: Clone repo and return fileIndex to send to User in UI.
        return cloneRepo(githubRepoUrl, tempPath)
          .then(() => {
            return new Promise((fulfill, reject) => {
              let filesystem = require('fs');
              fs.readdir(tempPath, function(err: any, fileIndex) {
                if (err) {
                  logger.error('DockerController::raiseContainer() cloneRepo()' + err);
                  reject(err);
                }
                logger.info('DockerController::raiseContainer() Repo File Index: ', fileIndex);
                fulfill(fileIndex);
              });
            });
          })
          .catch((err: any) => {
            if (typeof payload.deliverableName === 'undefined') {
              deliv.dockerLogs.buildHistory = err.toString();
              deliv.save();
            } else {
              course.dockerLogs.buildHistory = err.toString();
              course.save();
            }
            reject(err);
            throw err;
          });
      })
      .then((fileIndexArr: string[]) => {
        // FIFTH: Check that files exist in cloned repo and ensure that Dockerfile exists
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
        // SIXTH: RUN docker-build-helper.sh to create and tag docker image ready for AutoTest
        // Send back notification message to API that build has started.
        let delivInput = typeof payload.deliverableName === 'undefined' ? 0 : payload.deliverableName;
        let envInput = config.env === 'production' ? 1 : 0;
        let githubToken = String(config.github_auth_token).replace('token ', '');
        logger.info('DockerController::buildContainer() ENV: ' + config.env);

        if (typeof payload.deliverableName !== 'undefined') {
          deliv.buildingContainer = true;
          deliv.dockerLogs.destroyHistory = '';
          deliv.dockerLogs.buildHistory = '';
          deliv.markModified('dockerLogs');
          deliv.save()
            .then((deliv: IDeliverableDocument) => {
              fulfill(`Starting Docker build of ${tagName}...`);
            });
        } else {
          course.dockerLogs.destroyHistory = '';
          course.dockerLogs.buildHistory = '';
          course.buildingContainer = true;
          course.markModified('dockerLogs');
          course.save()
            .then((course: ICourseDocument) => {
              fulfill(`Starting Docker build of ${tagName}...`);
            });
        }
        
        return exec(`${APP_PATH}app/scripts/docker-build-helper.sh ${tempPath} ${githubToken} ${course.courseId} ${delivInput} ` +
          `${envInput} ${config.app_path}:1${course.courseId}/`)
            .then(function (result: any) {
              logger.info('DockerController:: Building Container STDOUT/STDERR:');
              logger.info('DockerController:: Building Container STDOUT:' + result.stdout);
              logger.info('DockerController:: Building Container STDERR:' + result.stderr);
              dockerLogs.buildHistory = result.stdout + '\n' + result.stderr;
              return dockerLogs;
              })
            .then(() => {
              console.log('DockerController:: Building Container SUCCESS');
              if (typeof payload.deliverableName !== 'undefined') {
                deliv.dockerLogs = dockerLogs;
                deliv.dockerImage = tagName;
                deliv.buildingContainer = false;
                deliv.save();
              } else {
                course.dockerLogs = dockerLogs;
                course.buildingContainer = false;
                course.dockerImage = tagName;
                course.save();
              }
              tempDir.cleanup();
            });
      })
      .catch((err) => {
        // Handle some of the Log and Clean-up saving logic in case of error. Then throw original error
        // to the API.
        if (typeof payload.deliverableName !== 'undefined') {
          console.log(err.stdout);
          console.log(err.stderr);
          dockerLogs.buildHistory += err.stdout + '\n\n' + dockerLogs.buildHistory;

          if (typeof err.stdout === 'undefined' || typeof err.stdout === 'undefined') {
            dockerLogs.buildHistory += err;
          }

          deliv.dockerLogs = dockerLogs;
          deliv.buildingContainer = false;
          deliv.save();
        } else {
          dockerLogs.buildHistory = err.stdout + '\n' + err.stderr;
          course.dockerLogs = dockerLogs;
          course.buildingContainer = false;
          course.save();
        }
        tempDir.cleanup();
        logger.error('DockerController:: Building Container ERROR ' + err);
        reject(err);
      });
    });

  }

  /**
   * Gets a list of users who are Admins underneath a particular course
   * @param payload.courseId string ie. '310'
   * @param payload.deliverableName string ie. 'd2', 'p53'
   * @return User[] A list of admins
   */
  function destroyContainer(payload: any): Promise<any> {
    let tagName: string; 
    let course: ICourseDocument;
    let deliv: IDeliverableDocument;

    // Accumulates log information and then saves it to Course or Deliverable.
    let stdErr: string = '';
    let stdOut: string = '';

    if (typeof payload.deliverableName === 'undefined') {
      tagName = 'autotest/cpsc' + payload.courseId + '__bootstrap';
    } else {
      tagName = 'autotest/cpsc' + payload.courseId + '__' + payload.deliverableName + '__bootstrap';
    }

    logger.info('DockerController::destroyContainer() Tag Name: ' + tagName + ' - start');
    return Course.findOne({courseId: payload.courseId})
      .then((c: ICourseDocument) => {
        if (c) {
          course = c;
          return c;
        }
        throw `Could not find Course for ${payload.courseId}`;
      })
      .then(() => {
        if (typeof payload.deliverableName === 'undefined') {
          return null;
        } else {
          return Deliverable.findOne({courseId: course._id, name: payload.deliverableName})
            .then((d: IDeliverableDocument) => {
              if (d) {
                deliv = d;
                return d;
              }
              throw `Could not find  Deliverable ${payload.deliverableName} under Course ${payload.courseId}`;
            });
        }
      })
      .then(() => {
        // # FIRST: Ensure that container tag to be destroyed exists.
        return exec(GET_CONTAINER_LIST_CMD)
          .then((process: any) => {
            logger.info('DockerController::destroyContainer() STDOUT:' + process.stdout);
            logger.error('DockerController::destroyContainer() STDERR:' + process.stderr);

            stdErr += process.stderr;
            stdOut += process.stdout;

            if (String(process.stdout).indexOf(tagName) > -1) {
              logger.info('DockerController::destroyContainer() FOUND Docker Tag ' + tagName);
            } else {
              logger.info('DockerController::destroyContainer() NOT FOUND Docker Tag ' + tagName);
              throw `Could not destroy container ${tagName} because it does not exist.`;
            }
            return;
          })
          .then(() => {
            // # SECOND: Run script helper to destroy tag
            return exec(`${APP_PATH}app/scripts/docker-destroy-helper.sh ${tagName}`)
              .then((process: any) => {
                logger.info('DockerController::destroyContainer() STDOUT:', process.stdout);
                logger.error('DockerController::destroyContainer() STDERR:', process.stderr);
                stdErr += process.stderr;
                stdOut += process.stdout;
              });
          })
          .then(() => {
            // # THIRD: Save to respective Course or Deliverable.
            if (typeof payload.deliverableName === 'undefined') {
              course.dockerLogs.destroyHistory = stdOut + stdErr;
              course.dockerImage = '';
              course.markModified('dockerLogs');
              return course.save();
            } else {
              deliv.dockerLogs.destroyHistory = stdOut + stdErr;
              deliv.dockerImage = '';
              deliv.markModified('dockerLogs');
              return deliv.save();
            }
          })
          .catch((err: any) => {
            logger.error('DockerController:: ERROR ' + err);
            throw err;
          });
      });
}

/**
 * Determines if a container has been built based on Course, or a Deliverable if a 
 * deliverableName is specified.
 * 
 * @param payload.courseId String course id ie. '310'
 * @param payload.deliverableName String deliverable name ie. 'd1'
 * @return Boolean returns true if built.
 */
function isContainerBuilt(payload: any) {
  logger.info('GithubManager::isContainerBuilt() - start');
  let course: ICourseDocument;
  let deliv: IDeliverableDocument;

  return Course.findOne({courseId: payload.courseId})
    .then((c: ICourseDocument) => {
      if (c) {
        course = c;
        return c;
      }
      throw `Could not find Course under ${payload.coursId}`;
    })
    .then(() => {
      if (typeof payload.deliverableName !== 'undefined') {
        return Deliverable.findOne({courseId: course._id, name: payload.deliverableName})
          .then((d: IDeliverableDocument) => {
            if (d) {
              deliv = d;
              return d;
            }
            throw `Could not find Deliverable ${payload.deliverableName} under ${payload.courseId}`;
          });
      }
      return null;
    })
    .then(() => {
      if (typeof payload.deliverableName === 'undefined') {
        let tagName = DOCKER_PREPEND + course.courseId + DOCKER_APPEND;
        return tagName;
      } else {
        let tagName = DOCKER_PREPEND + course.courseId + '__' + deliv.name + DOCKER_APPEND;
        return tagName;
      }
    })
    .then((tagName: string) => {
      return exec(GET_CONTAINER_LIST_CMD)
      .then(function (result: any) {
        logger.info('GithubManager::isContainerBuilt() Looking for ' + tagName);
        logger.info('GithubManager::isContainerBuilt() STDOUT/STDERR:');
        console.log('stdout: ', result.stdout);
        console.log('stderr: ', result.stderr);
        if (String(result.stdout).indexOf(tagName) > -1) {
          return true;
        }
        return false;
      });
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
      console.log('stdout: ', result.stdout);
      console.log('stderr: ', result.stderr);
      return result;
    });
}

export {
  buildContainer, destroyContainer, isContainerBuilt
};
