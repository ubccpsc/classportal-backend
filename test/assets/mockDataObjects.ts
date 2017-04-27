import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { ITeamDocument, Team } from '../../app/models/team.model';
import { ICourseDocument, Course } from '../../app/models/course.model';
import { IUserDocument, User } from '../../app/models/user.model';
import { IDeliverableDocument, Deliverable } from '../../app/models/deliverable.model';

let USER_1_THOMAS: IUserDocument;
let USER_2_CYNTHIA: IUserDocument;
let COURSE_710: ICourseDocument;
let COURSE_610: ICourseDocument;

function initializeData() {
  User.findOne({ csid: 12312321, fname: 'Thomas' })
    .exec()
    .then(c => { return USER_1_THOMAS = c; });
  User.findOne({ csid: 999999222, fname: 'Cynthia' })
    .exec()
    .then(c => { return USER_2_CYNTHIA = c; });
  Course.findOne({ courseId: '710' })
    .exec()
    .then(c => { return COURSE_710 = c; });
  Course.findOne({ courseId: '610' })
    .exec()
    .then(c => { return COURSE_610 = c; });
}

export { initializeData, USER_1_THOMAS, USER_2_CYNTHIA, COURSE_610, COURSE_710 }