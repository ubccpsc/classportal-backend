import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { ITeamDocument, Team } from '../../app/models/team.model';
import { ICourseDocument, Course } from '../../app/models/course.model';
import { IUserDocument, User } from '../../app/models/user.model';
import { IDeliverableDocument, Deliverable } from '../../app/models/deliverable.model';

let USER_1_THOMAS: IUserDocument;
let USER_2_CYNTHIA: IUserDocument;
let USER_3_REGIS: IUserDocument;
let USER_4_CONNOR: IUserDocument;
let USER_5_AGENT: IUserDocument;
let USER_6_ROGER: IUserDocument;
let COURSE_710: ICourseDocument;
let COURSE_610: ICourseDocument;
let DELIVERABLE_1: IDeliverableDocument;
let DELIVERABLE_2: IDeliverableDocument;

function initializeData() {
  let data1 = User.findOne({ csid: 12312321, fname: 'Thomas' })
    .exec()
    .then(c => { return USER_1_THOMAS = c; });
  let data2 = User.findOne({ csid: 999999222, fname: 'Cynthia' })
    .exec()
    .then(c => { return USER_2_CYNTHIA = c; });
  let data3 = Course.findOne({ courseId: '710' })
    .exec()
    .then(c => { return COURSE_710 = c; });
  let data4 = Course.findOne({ courseId: '610' })
    .exec()
    .then(c => { return COURSE_610 = c; });
  let data5 = Deliverable.findOne({ name: 'Assignment 1' })
    .exec()
    .then(d => { return DELIVERABLE_1 = d; });
  let data6 = Deliverable.findOne({ name: 'Assignment 2' })
    .exec()
    .then(d => { return DELIVERABLE_1 = d; });
  let data7 = User.findOne({ csid: 'c3c1', fname: 'Agent' })
    .exec()
    .then(c => { return USER_5_AGENT = c; });
  let data8 = User.findOne({ csid: 'a1a1', fname: 'Connor' })
    .exec()
    .then(c => { return USER_4_CONNOR = c; });
  let data9 = User.findOne({ csid: 'b2b1', fname: 'Roger' })
    .exec()
    .then(c => { return USER_6_ROGER = c; });
  let data10 = User.findOne({ csid: 'e5e5', fname: 'Regis' })
    .exec()
    .then(c => { return USER_3_REGIS = c; });

  return Promise.all([data1, data2, data3, data4, data5, data6]);
}

export { initializeData, USER_1_THOMAS, USER_2_CYNTHIA, USER_3_REGIS, USER_4_CONNOR,
  USER_5_AGENT, USER_6_ROGER, COURSE_610, COURSE_710, DELIVERABLE_1, DELIVERABLE_2 }