import {passport} from '../../config/auth';
import {User} from '../models/user.model';
import {Course, ICourseDocument} from '../models/course.model';
import * as restify from 'restify';
import {config} from '../../config/env';
import {logger} from '../../utils/logger';

let errors = require('restify-errors');

const ADMIN_ROLE: string = 'admin';
const SUPERADMIN_ROLE: string = 'superadmin';

/**
 * Verifies if authentication valid and redirects on basis of boolean result.
 * @return boolean
 */

const isAuthenticated = (req: any, res: any, next: restify.Next) => {
  if (req.isAuthenticated()) {
    console.log('auth.middleware::isAuthenticated() - authenticated: ' + req.user.username);
    return next();
  } else {
    res.redirect('/login', next);
  }
};

const adminAuth = (req: any, res: restify.Response, next: restify.Next) => {
  if (typeof req.user === 'undefined') {
    console.log('auth.middleware::isAuthenticated() - admin authenticated: no session username available');    
    return next(new errors.UnauthorizedError('Permission denied.'));
  }
  console.log('auth.middleware::isAuthenticated() - admin authenticated: ' + req.user.username);
  let userrole: string = String(req.user.userrole);
  if (req.isAuthenticated() === true && userrole === ADMIN_ROLE || userrole === SUPERADMIN_ROLE) {
    return next();
  }
  next(new errors.UnauthorizedError('Permission denied.'));
};

/*
 * To be inserted on routes as middleware where routes need to be accessed by staff
 * Brought up in AutoTest Improvements.docx on March 28, 2018.
 */
const staffOrAdminAuth = (req: any, res: restify.Response, next: restify.Next) => {
  console.log('auth.middleware::isAuthenticated() - admin authenticated: ' + req.user.username);
  if (typeof req.user === 'undefined') {
    console.log('auth.middleware::isAuthenticated() - admin authenticated: no session username available');    
    return next(new errors.UnauthorizedError('Permission denied.'));
  }

  return Course.findOne({courseId: req.params.courseId})
    .then((course: ICourseDocument) => {
      if (course) {
        return course;
      }
      return next(new errors.UnauthorizedError('Permission denied.'));
    })
    .then((course: ICourseDocument) => {
      let isStaffOrAdmin: boolean = false;
      course.admins.map((user) => {
        if (user.username === req.user.username) {
          isStaffOrAdmin = true;
        } 
      }); 
      course.staffList.map((user) => {
        if (user.username === req.user.username) {
          isStaffOrAdmin = true;
        }
      });

      if (isStaffOrAdmin || isSuperAdmin) {
        return next();
      } else {
        return next(new errors.UnauthorizedError('Permission denied.'));
      }
    });
};

/*
 * To replace the deprecated adminAuthenticated middleware by Anthony et al. 
 * Brought up in AutoTest Improvements.docx on March 28, 2018.
 */
const NEW_adminAuth = (req: any, res: restify.Response, next: restify.Next) => {
  console.log('auth.middleware::isAuthenticated() - admin authenticated: ' + req.user.username);
  if (typeof req.user === 'undefined') {
    console.log('auth.middleware::isAuthenticated() - admin authenticated: no session username available');    
    return next(new errors.UnauthorizedError('Permission denied.'));
  }

  return Course.findOne({courseId: req.params.courseId})
    .then((course: ICourseDocument) => {
      if (course) {
        return course;
      }
      return next(new errors.UnauthorizedError('Permission denied.'));
    })
    .then((course: ICourseDocument) => {
      let adminExistsInCourse: boolean = false;
      course.admins.map((user) => {
        if (user.username === req.user.username) {
          adminExistsInCourse = true;
        } 
      });

      if (adminExistsInCourse || isSuperAdmin) {
        return next();
      } else {
        return next(new errors.UnauthorizedError('Permission denied.'));
      }
    });
};

const superAuth = (req: any, res: restify.Response, next: restify.Next) => {
  if (req.isAuthenticated()) {
    let userrole = req.user.userrole;
    let superAdmin = function () {
      return userrole === 'superadmin' ? true : false;
    };
    if (superAdmin()) {
      return next();
    }
  }
  next(new errors.UnauthorizedError('Permission denied.'));
};

const isAdmin = (req: any, res: restify.Response, next: restify.Next) => {
  if (req.isAuthenticated()) {
    let loggedInUser = req.user.username;
    let adminOrSuperAdmin = function () {
      return config.admins.indexOf(loggedInUser) >= 0 || config.super_admin.indexOf(loggedInUser) >= 0 ? true : false;
    };
    if (adminOrSuperAdmin()) {
      return true;
    }
  }
  return false;
};

const isSuperAdmin = (req: any, res: restify.Response, next: restify.Next) => {
  if (req.isAuthenticated()) {
    let loggedInUser = req.user.username;
    return config.super_admin.indexOf(loggedInUser) >= 0 ? true : false;
  }
  return false;
};


export {isAuthenticated, adminAuth, superAuth, staffOrAdminAuth, isAdmin, isSuperAdmin, NEW_adminAuth};
