import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { IUserDocument, User } from '../models/user.model';
import { ICourseDocument, Course } from '../models/course.model';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';
import * as request from '../helpers/request';

function isStudentInSameLab(payload: any, _loggedInUser: string): Promise<object> {
  let course: ICourseDocument;
  let loggedInUser: IUserDocument;
  let comparisonUser: IUserDocument;
  let isInLab: boolean = false;

  return Course.findOne({ courseId: payload.courseId })
    .exec()
    .then((_course: ICourseDocument) => {
      course = _course;
      return course;
    })
    .then(() => {
      return User.findOne({ username: payload.username })
        .then((_user: IUserDocument) => {
          if (_user) {
            comparisonUser = _user;
            return _user;
          }
          return _user;
        })
        .catch(err => {
          logger.error(`UserController::isStudentInSameLab ERROR ${err}`);
        });
    })
    .then(() => {
      return User.findOne({ username: _loggedInUser })
        .then((_user: IUserDocument) => {
          if (_user) {
            loggedInUser = _user;
            return _user;
          }
          return _user;
        })
        .catch(err => {
          logger.error(`UserController::isStudentInSameLab ERROR ${err}`);
        });
    })
    .then((u) => {
      if (!comparisonUser || !loggedInUser) {
        return { username: payload.username, sameLab: isInLab };
      }
      // cannot add one's self to a team
      if (_loggedInUser === String(payload.username)) {
        return { username: payload.username, sameLab: isInLab };
      }

      let labSections: any = course.labSections;
      let loggedInUserLabId: string;
      let labIndexNum: number;

      // FIRST: Get logged in user labId 
      for (let i = 0; i < labSections.length; i++) {
        let labId: string = String(labSections[i].users.indexOf(loggedInUser._id) );
        
        if (labSections[i].users.indexOf(loggedInUser._id) > -1) {
          console.log((labSections[i].users.indexOf(loggedInUser._id) > -1));
          loggedInUserLabId = labSections[i].labId;
          labIndexNum = i;
        }
      }

      // SECOND: Check if comparisonUser is in same LabId
      if (labSections[labIndexNum].users.indexOf(comparisonUser._id) > -1) {
        isInLab = true;
      }

      return { username: payload.username, sameLab: isInLab };
    });
}

/**
 * User login
 * @param {string} authcode - GitHub authcode
 * @returns {string} servertoken
 */
function login(authcode: string, csid: string, snum: string) {
  return Promise.resolve(authcode)
    .then(request.retrieveAccessToken)
    .then(request.retrieveUsername)
    .then((username: string) => {
      return User.findWith({ username })
        .then((user: any) => {
          return Promise.resolve(user);
        })
        .catch(() => {
          return User.findWith({ csid, snum })
            .then((user: any) => {
              return Promise.resolve(user);
            })
            .catch(() => {
              return Promise.reject('Could not find user by username or by csid!');
            });
        });
    })
    .then((user: IUserDocument) => user.createServerToken())
    .catch(Promise.reject);
}

/**
 * Search for a user by csid and snum, and append it to req.params if successful.
 * @returns {Promise<IUserDocument>}
 */
function checkRegistration(csid: string, snum: string): Promise<IUserDocument> {
  if ( !csid && !snum ) {
    return Promise.reject('CSID and SNUM not supplied');
  } else {
    return User.findOne({ 'csid': csid, 'snum' : snum }).exec() || Promise.reject('User does not exist');
  }
}

/**
 * Logout by deleting server token
 */
function logout(user: IUserDocument) {
  return user.deleteServerToken()
    .catch(Promise.reject);
}

/**
 * Load data needed to display portal
 */
function load(user: IUserDocument) {
  return Promise.resolve(user)
    // .then(loadGrades)
    .then((user: IUserDocument) => {
      // todo: add more things to userdata
      return Object.assign({}, user);
    })
    .catch(Promise.reject);
}


/**
* Verifies that CSID and SNUM are valid before Github authentication/registration
* @param {restify.Request} restify request object
* @param {restify.Response} restify response object
* @param {restify.Next} restify next object
* @return {IUserDocument || void } that matches request object CSID and SNUM params
**/
function validateRegistration(req: any, res: any, next: restify.Next) {

  let csid = req.params.csid;
  let snum = req.params.snum;
  let query = User.findOne({ 'csid' : csid, 'snum' : snum }).exec();
  return query.then( user => {

    if (user === null) {
      return Promise.reject(Error('Unable to validate CSID and SNUM'));
    } else if (isUsernameRegistered(user)) {
      return Promise.reject(Error('User is already registered'));
    } else {
      return res.redirect('/auth/github/register', next);
    }
  });
}

/**
* Verifies that CSID and SNUM are valid before Github authentication/registration
* @param {restify.Request} restify request object
* @return {IUserDocument} that matches request object CSID and SNUM params
**/
function addGithubUsername(req: any) {
  logger.info('addGithubUsername() in Courses Controller');
  let csid = req.params.csid;
  let snum = req.params.snum;
  let username = req.params.username;
  let query = User.findOne({ 'csid' : csid, 'snum' : snum }).exec();

  return query.then( user => {
    if (!user) {
      return Promise.reject(Error('Unable to validate CSID and SNUM'));
    } else if (isUsernameRegistered(user)) {
      return Promise.reject(Error('User is already registered'));
    } else {
      user.username = username;
      return user.save();
    }
  });
}

/**
* Determines if Github Username is already registered in User object
* @param {IUserDocument} mongoose user instance
* @return {boolean} true if exists
**/
function isUsernameRegistered(user: IUserDocument) {
  if (user.username !== '') {
    return true;
  }
  console.log('username' + user.username);
  return false;
}


export { login, logout, checkRegistration, load, validateRegistration, addGithubUsername, isStudentInSameLab };