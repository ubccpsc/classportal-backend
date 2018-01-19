import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import {IUserDocument, User} from '../models/user.model';
import {ICourseDocument, Course} from '../models/course.model';
import {logger} from '../../utils/logger';
import {config} from '../../config/env';
import * as request from '../helpers/request';

/**
 * @param payload.courseId string ie. 310
 * @param payload.username ie. 'jsmith', or 'xd2f2'
 * @param requestHeader.username // aka currently logged in username
 * @return boolean is in same lab: true.
 */
function isStudentInSameLab(payload: any, _loggedInUser: string): Promise<object> {
  let course: ICourseDocument;
  let loggedInUser: IUserDocument;
  let comparisonUser: IUserDocument;
  let isInLab: boolean = false;

  return Course.findOne({courseId: payload.courseId})
    .exec()
    .then((_course: ICourseDocument) => {
      course = _course;
      return course;
    })
    .then(() => {
      return User.findOne({username: payload.username})
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
      return User.findOne({username: _loggedInUser})
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
        return {username: payload.username, inSameLab: isInLab};
      }

      let labSections: any = course.labSections;
      let loggedInUserLabId: string;
      let labIndexNum: number;

      // FIRST: Get logged in user labId
      for (let i = 0; i < labSections.length; i++) {
        let labId: string = String(labSections[i].users.indexOf(loggedInUser._id));

        if (labSections[i].users.indexOf(loggedInUser._id) > -1) {
          console.log((labSections[i].users.indexOf(loggedInUser._id) > -1));
          loggedInUserLabId = labSections[i].labId;
          labIndexNum = i;
        }
      }

      // SECOND: Check if comparisonUser is in same LabId
      if (typeof labIndexNum !== 'undefined' && labSections[labIndexNum].users.indexOf(comparisonUser._id) > -1) {
        isInLab = true;
      }

      return {username: payload.username, inSameLab: isInLab};
    });
}

export {isStudentInSameLab};
