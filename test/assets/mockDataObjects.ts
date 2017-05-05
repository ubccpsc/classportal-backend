import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { ITeamDocument, Team } from '../../app/models/team.model';
import { ICourseDocument, Course } from '../../app/models/course.model';
import { IGradeDocument, Grade } from '../../app/models/grade.model';
import { IUserDocument, User } from '../../app/models/user.model';
import { IDeliverableDocument, Deliverable } from '../../app/models/deliverable.model';

let faker = require('faker');
let USER_1_THOMAS: IUserDocument;
let USER_2_CYNTHIA: IUserDocument;
let USER_3_REGIS: IUserDocument;
let USER_4_CONNOR: IUserDocument;
let USER_5_AGENT: IUserDocument;
let USER_6_ROGER: IUserDocument;
let RANDOM_STUDENT_1: IUserDocument;
let RANDOM_STUDENT_2: IUserDocument;
let RANDOM_STUDENT_3: IUserDocument;
let RANDOM_STUDENT_4: IUserDocument;
let RANDOM_GRADE_1: IGradeDocument;
let RANDOM_GRADE_2: IGradeDocument;
let COURSE_NO_ADMINS_SERIALIZED: ICourseDocument;
let COURSE_710: ICourseDocument;
let COURSE_610: ICourseDocument;
let DELIVERABLE_1: IDeliverableDocument;
let DELIVERABLE_2: IDeliverableDocument;
let TEAM_COMPUTATIONAL_THEORY: ITeamDocument;
const RANDOM_NEW_COURSE_NUM = faker.random.number(99999);
const REAL_GITHUB_USERNAME = 'thekitsch';
const GITHUB_URL = 'http://www.github.com/ubccpsc/classportal-backend/';
const TEAM_ID = faker.random.number(9999);
const LOCAL_STUDENT_LOGIN = { username: 'thekitsch', snum: 5 };
const TEAM_NAME = 'Computational Theory Group';
const TEAM_ADMINS = ['brandy', 'sammy', 'tammy'];
const INVALID_COURSE_NUM = 293;
const ADMIN_PAYLOAD_VALID = { fname: 'Thomas', lname: 'Smith', username: 'thekitsch' };
const ADMIN_PAYLOAD_INVALID_USER = { fname: 'Jean', lname: 'Grey', username: 'comicbookfan' };
let INVALID_MIN_TEAM_PAYLOAD: ITeamDocument;


function initializeParentData() {
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
    .then(d => { DELIVERABLE_1 = d; return d; });
  let data6 = Deliverable.findOne({ name: 'Assignment 2' })
    .exec()
    .then(d => { DELIVERABLE_2 = d; return d; });
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
  let data11 = User.create({ csid: faker.random.number(999999999), snum: faker.random.number(9999999),
    fname: faker.name.firstName(), lname: faker.name.lastName(), courses: new Array(),
    username: faker.internet.userName() })
    .then(c => { c.save(); return RANDOM_STUDENT_1 = c; });
  let data12 = User.create({ csid: faker.random.number(999999999), snum: faker.random.number(9999999),
    fname: faker.name.firstName(), lname: faker.name.lastName(), courses: new Array(),
    username: faker.internet.userName() })
    .then(c => { c.save(); return RANDOM_STUDENT_2 = c; });
  let data13 = User.create({ csid: faker.random.number(999999999), snum: faker.random.number(9999999),
    fname: faker.name.firstName(), lname: faker.name.lastName(), courses: new Array(),
    username: faker.internet.userName() })
    .then(c => { c.save(); return RANDOM_STUDENT_3 = c; });
  let data14 = User.create({ csid: faker.random.number(999999999), snum: faker.random.number(9999999),
    fname: faker.name.firstName(), lname: faker.name.lastName(), courses: new Array(),
    username: faker.internet.userName() })
    .then(c => { c.save(); return RANDOM_STUDENT_4 = c; });
  let data15 = User.create({ csid: faker.random.number(999999999), snum: faker.random.number(9999999),
    fname: faker.name.firstName(), lname: faker.name.lastName(), courses: new Array(),
    username: faker.internet.userName() })
    .then(c => { c.save(); return RANDOM_STUDENT_4 = c; });
  let data16 = Deliverable.findOne({ name: 'Assignment 1' })
    .exec()
    .then(d => {
      return Team.findOrCreate({
        name: 'Computational Theory Group', teamId: RANDOM_NEW_COURSE_NUM,
        githubUrl: 'http://www.github.com/ubccpsc/classportal-backend/1', deliverable: d._id,
        admins: new Array(), course: d.courseId, members: [RANDOM_STUDENT_3._id, RANDOM_STUDENT_4._id],
      })
       .then( t => { console.log('got into the return' + t); return TEAM_COMPUTATIONAL_THEORY = t; })
       .catch(err => console.log(err));
    });
  let data17 = Deliverable.findOne({ name: 'Assignment 2' })
    .exec()
    .then(d => { return d; });

  return Promise.all<any>([data1, data2, data3, data4, data5, data6, data11, data12, data13,
    data14, data15, data16, data17]);
}

function initializeChildData() {
  let data1 = Grade.findOrCreate({
    snum: USER_3_REGIS.snum,
    deliv: DELIVERABLE_1.name,
    details: { finalGrade: '99' },
  });
  let data2 = Grade.findOrCreate({
    snum: USER_4_CONNOR,
    deliv: DELIVERABLE_1.name,
    details: { finalGrade: '11' },
  });
  return Promise.all<any>([data1, data2]);
}

function initializeData() {
  return initializeParentData()
    .then( () => {
      return initializeChildData();
    });
}

export { initializeData, USER_1_THOMAS, USER_2_CYNTHIA, USER_3_REGIS, USER_4_CONNOR,
  USER_5_AGENT, USER_6_ROGER, COURSE_610, COURSE_710, DELIVERABLE_1, DELIVERABLE_2,
  GITHUB_URL, TEAM_ID, TEAM_NAME, TEAM_ADMINS, RANDOM_STUDENT_1, RANDOM_STUDENT_2,
  RANDOM_STUDENT_3, RANDOM_STUDENT_4, TEAM_COMPUTATIONAL_THEORY, LOCAL_STUDENT_LOGIN,
  ADMIN_PAYLOAD_VALID, ADMIN_PAYLOAD_INVALID_USER, INVALID_COURSE_NUM, INVALID_MIN_TEAM_PAYLOAD,
  REAL_GITHUB_USERNAME, RANDOM_GRADE_1, RANDOM_GRADE_2 }