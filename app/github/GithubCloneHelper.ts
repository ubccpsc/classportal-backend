import {logger} from '../../utils/logger';
import {config} from '../../config/env';
import {Helper} from "../github/util";
import {link} from "fs";
import db from '../db/MongoDBClient';
import {ITeamDocument, Team} from '../models/team.model';
import {IProjectDocument, Project} from '../models/project.model';
import {IDeliverableDocument} from '../models/deliverable.model';
let fs = require('fs');
let tmp = require('tmp-promise');
let request = require('request');
let rp = require('request-promise-native');
let async = require('async');
let _ = require('lodash');
let apiPath = config.github_api_path;
const STAFF = 'staff';
let exec = require('child-process-promise').exec;

/**
 * 
 * NOTE: REFACTOR INTO CREATE/REPAIR METHOD IN CLASS NEEDED & EASY:
 * 
 * Create or repairs Github Repos by cloning starter code and redistributing it from 
 * the file-system command-line level. 
 * 
 *                                    *** WARNING ***
 *                     ---Be careful when modifying this script!---
 *                             YOU could affect Student Work
 * 
 * @param studentRepoUrl string Https://github.com/repo address with the auth token if needed
 * @param starterCodeRepoUrl string Https://github.com/repo address with the auth token if needed
 * @param actionType string "REPAIR" or "CREATE" options.
 * 
 */
const REPO_MAKER = async function (starterCodeRepoUrl: string, studentRepoUrl: string, actionType: string, deliv: IDeliverableDocument) {
  logger.info('GithubHelper::REPO_MAKER() - Start - Action Type: ' + actionType);
  const REPAIR: string = 'REPAIR';
  const CREATE: string = 'CREATE';
  const INITIAL_COMMIT_TAG: string = 'Initial commit';
  const ON_MASTER_TAG: string = 'On branch master';
  let importToken: string = deliv.deliverableKey !== '' ? deliv.deliverableKey : '';
  let authedStudentRepo = Helper.addGithubAuthToken(studentRepoUrl, importToken);
  let authedStarterCodeRepo = Helper.addGithubAuthToken(starterCodeRepoUrl, config.github_clone_token);
  logger.info('GithubHelper::REPO_MAKER() - Auth/Unauth Student Repo: ' + actionType);
  logger.info('GithubHelper::REPO_MAKER() - Auth/Unauth Starter Code Repo: ' + actionType);

  if (deliv.deliverableKey !== '') {
    logger.info('GithubManager::importRepoFS() USING Deliverable.deliverableKey as Starter Code Auth');
  }

  let tempImportDir = await tmp.dir({dir: '/recycling', unsafeCleanup: true});
  let tempStudentDir = await tmp.dir({dir: '/recycling', unsafeCleanup: true});
  let tempImportPath = tempImportDir.path;
  let tempStudentRepoPath = tempStudentDir.path;

  if (actionType === CREATE) {
    return cloneImportRepo().then(() => {
      return enterImportRepoPath()
        .then(() => {
          return removeImportGitDir();
        })
        .then(() => {
          return initGitDir();
        })
        .then(() => {
          return changeGitRemote();
        })
        .then(() => {
          return addFilesToRepo();
        })
        .then(() => {
          return pushToNewRepo();
        })
        .catch((err: any) => {
          logger.error(`githubManager::cloneRepo() ` + err);
        });
    });
  } else if (actionType === REPAIR) {
    return cloneImportRepo()
        .then(() => {
          return cloneStudentRepo();
        })
        .then(() => {
          return gitStatusStudentRepo();
        })
        .then((stdOut: string) => {
          return getStudentDirFileIndex()
            .then((fileIndex: string[]) => {
              return {stdOut: stdOut, fileIndex: fileIndex};
            });
        })
        .then((studentRepoInfo: any) => {
          let fileIndex = studentRepoInfo.fileIndex;
          let gitStatusStdOut: string = studentRepoInfo.stdOut;
          console.log('stdout STUDENT "git status"', gitStatusStdOut);
          if (typeof fileIndex !== 'undefined' && fileIndex !== null && gitStatusStdOut.indexOf(INITIAL_COMMIT_TAG) > -1) {
            return enterImportRepoPath()
              .then(() => {
                return removeImportGitDir();
              })
              .then(() => {
                return initGitDir();
              })
              .then(() => {
                return changeGitRemote();
              })
              .then(() => {
                return addFilesToRepo();
              })
              .then(() => {
                return pushToNewRepo();
              });
          } else {
            logger.info('githubManager::cloneRepo() INFO Student Repo Not Empty or not Initial Commit' + 
              '. Skipping Starter Code Push Repair on ' + studentRepoUrl);
          }
          
        })
        .catch((err: any) => {
          logger.error(`githubManager::cloneRepo() ERROR in Repair Mode: ` + err);
        });

  } else {
    throw `Only Repair or Create actions are allowed in GithubHelper::REPO_MAKER()`;
  }

  function cloneImportRepo() {
    logger.info('GithubManager::cloneImportRepo() begins');
    return exec(`git clone ${authedStarterCodeRepo} ${tempImportPath}`)
      .then(function (result: any) {
        logger.info('GithubManager::cloneImportRepo STDOUT/STDERR:');
        console.log('GithubManager::cloneImportRepo stdout: ', result.stdout);
        console.log('GithubManager::cloneImportRepo stderr: ', result.stderr);
      });
  }
  
  function cloneStudentRepo() {
    logger.info('GithubManager::cloneStudentRepo() begins');
    return exec(`git clone ${authedStudentRepo} ${tempStudentRepoPath}`)
      .then(function (result: any) {
        logger.info('GithubManager::loneStudentRepo() STDOUT/STDERR:');
        logger.info('GithubManager::cloneStudentRepo() stdout: ', result.stdout);
        logger.info('GithubManager::cloneStudentRepo() stderr: ', result.stderr);
      });
  }

  function getStudentDirFileIndex(): Promise<string[]> {
    return new Promise((fulfill, reject) => {
      logger.info('GithubManager::getStudentDirFileIndex() begins');
      fs.readdir(tempStudentRepoPath, (err: any, fileIndex: any) => {
        if (err) {
          reject(err);
        }
        fulfill(fileIndex);
      });
    });

  }

  function enterImportRepoPath() {
    logger.info('GithubManager::enterImportRepoPath() begins');
    return exec(`cd ${tempImportPath}`)
      .then(function (result: any) {
        logger.info('GithubManager::cloneRepo STDOUT/STDERR:');
        logger.info('GithubManager::enterImportRepoPath() stdout: ', result.stdout);
        logger.error('GithubManager::enterImportRepoPath() stderr: ', result.stderr);
      });
  }

  function removeImportGitDir() {
    logger.info('GithubManager::removeImportGitDir() begins');
    return exec(`cd ${tempImportPath} && rm -rf .git`)
      .then(function (result: any) {
        logger.info('GithubManager::cloneRepo STDOUT/STDERR:');
        console.log('GithubManager::removeImportGitDir() stdout: ', result.stdout);
        logger.error('GithubManager::removeImportGitDir() stderr: ', result.stderr);
      });
  }

  function initGitDir() {
    logger.info('GithubManager::initGitDir() begins');
    return exec(`cd ${tempImportPath} && git init`)
      .then(function (result: any) {
        logger.info('GithubManager::initGitDir() STDOUT/STDERR:');
        logger.info('GithubManager::initGitDir() stdout: ', result.stdout);
        logger.info('GithubManager::initGitDir() stderr: ', result.stderr);
      });
  }

  function changeGitRemote() {
    logger.info('GithubManager::changeGitRemote()');
    return exec(`cd ${tempImportPath} && git remote add origin ${authedStudentRepo}.git && git fetch --all`)
      .then(function (result: any) {
        logger.info('GithubManager::changeGitRemote() STDOUT/STDERR:');
        logger.info('GithubManager::changeGitRemote() stdout: ', result.stdout);
        logger.info('GithubManager::changeGitRemote() stderr: ', result.stderr);
      });
  }

  function addFilesToRepo() {
    logger.info('GithubManager::addFilesToRepo() ');
    return exec(`cd ${tempImportPath} && git add . && git commit -m "Starter files"`)
      .then(function (result: any) {
        logger.info('GithubManager::addFilesToRepo() STDOUT/STDERR:');
        logger.info('GithubManager::addFilesToRepo() stdout: ', result.stdout);
        logger.info('GithubManager::addFilesToRepo() stderr: ', result.stderr);
      });
  }

  function pushToNewRepo() {
    logger.info('GithubManager::pushToNewRepo()');
    return exec(`pushd ${tempImportPath} && git push origin master`)
      .then(function (result: any) {
        logger.info('GithubManager::pushToNewRepo() STDOUT/STDERR:');
        logger.info('GithubManager::pushToNewRepo() stdout: ', result.stdout);
        logger.info('GithubManager::pushToNewRepo() stderr: ', result.stderr);
      });
  }

  function gitStatusStudentRepo(): Promise<string> {
    logger.info('GithubManager::pushToNewRepo()');
    return exec(`cd ${tempStudentRepoPath} && git status`)
      .then(function (result: any) {
        logger.info('GithubManager::pushToNewRepo() STDOUT/STDERR:');
        logger.info('GithubManager::pushToNewRepo() stdout: ', result.stdout);
        logger.info('GithubManager::pushToNewRepo() stderr: ', result.stderr);
        return result.stdout;
      });
  }
};

export default REPO_MAKER;