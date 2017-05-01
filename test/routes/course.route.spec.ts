import * as chai from 'chai';
import * as supertest from 'supertest';
import { app } from '../../server';
import { logger } from '../../utils/logger';
import { expect, assert } from 'chai';
import { studentCookie } from './../assets/auth.agents';
import { ICourseDocument, Course } from '../../app/models/course.model';
import * as mockData from '../assets/mockDataObjects';

let agent = supertest.agent(app);

const CLASS_LIST_PATH = __dirname.replace('/build/test/routes', '') + '/test/assets/mockDataCList.csv';
const COURSE_DATA = {
  courseId : Math.floor(Math.random() * 99999),
  name : 'Computer Studies',
  minTeamSize : '1',
  maxTeamSize : '9',
  modules : new Array(),
  customData : {},
  icon: '//cdn.ubc.ca/clf/7.0.5/img/favicon.ico',
  studentsSetTeams : 1,
  admins : new Array(),
};

describe('POST :courseId/admin/admins', () => {
  before(function(done) {
    let initialize = mockData.initializeData()
    .then(() => {
      Course.findOne({ courseId: mockData.COURSE_710.courseId })
        .exec()
        .then( c => {
          if (c !== null) {
            Course.update({ courseId: '710' }, { $set: { 'admins': [] } })
              .exec()
              .then( () => {
                done();
              });
          }
        });
    });
  });

  const SUCCESS_RESPONSE = { 'response': 'Successfully updated course admin list on 710.' };
  const ADMIN_ALREADY_EXISTS = { 'err': 'Admin already exists in 710.' };
  const COURSE_DOES_NOT_EXIST = { 'err': 'Course 293 cannot be found.' };
  const USER_DOES_NOT_EXIST = { 'err': 'Admin does not exist. Please double-check that payload is correct.' };

  it('should return a successfully added updated admin list response', (done) => {

    agent
      .post('/' + mockData.COURSE_710.courseId + '/admin/admins')
      .send(mockData.ADMIN_PAYLOAD_VALID)
      .end((err: any, res: supertest.Response) => {
        expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_RESPONSE));
        if (err) {
          console.log(err);
          done(err);
        } else {
          done();
        }
      });
  });

  it('should return a successfully added updated admin list response', (done) => {

    agent
      .post('/' + mockData.COURSE_710.courseId + '/admin/admins')
      .send(mockData.ADMIN_PAYLOAD_VALID)
      .end((err: any, res: supertest.Response) => {
        expect(JSON.stringify(res.body)).to.equal(JSON.stringify(ADMIN_ALREADY_EXISTS));
        if (err) {
          console.log(err);
          done(err);
        } else {
          done();
        }
      });
  });

  it('should return a successfully cannot find course response', (done) => {
    agent
      .post('/' + mockData.INVALID_COURSE_NUM + '/admin/admins')
      .send(mockData.ADMIN_PAYLOAD_VALID)
      .end((err: any, res: supertest.Response) => {
        expect(JSON.stringify(res.body)).to.equal(JSON.stringify(COURSE_DOES_NOT_EXIST));
        if (err) {
          console.log(err);
          done(err);
        } else {
          done();
        }
      });
  });

  it('should return a successfully cannot find admin response', (done) => {
    agent
      .post('/' + mockData.COURSE_710.courseId + '/admin/admins')
      .send(mockData.ADMIN_PAYLOAD_INVALID_USER)
      .end((err: any, res: supertest.Response) => {
        expect(JSON.stringify(res.body)).to.equal(JSON.stringify(USER_DOES_NOT_EXIST));
        if (err) {
          console.log(err);
          done(err);
        } else {
          done();
        }
      });
  });

});

describe('PUT admin/:courseId', () => {

  const ERROR_RESULT = { err: 'Course validation failed' };
  const SUCCESS_RESULT = { response: 'Successfully added Course #' + COURSE_DATA.courseId };
  const ALREADY_EXISTS = { err: 'Course ' + COURSE_DATA.courseId + ' already exists' };

  it('should return a successfully added course # response', (done) => {
    agent
      .put('/admin/' + COURSE_DATA.courseId )
      .send(COURSE_DATA)
      .end((err: any, res: supertest.Response) => {
        expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_RESULT));
        if (err) {
          console.log(err);
          done(err);
        } else {
          done();
        }
      });
  });

  it('should result in an error because schema fails', (done) => {
    let randomNum = Math.floor(Math.random() * 99999);
    agent
      .put('/admin/' + randomNum )
      .send({ classList: 'not an array. faulty data' })
      .end((err: any, res: supertest.Response) => {
        expect(res.status).to.equal(500);
        expect(JSON.stringify(res.body)).to.equal(JSON.stringify(ERROR_RESULT));
        if (err) {
          console.log(err);
          done(err);
        } else {
          done();
        }
      });
  });


  it('should return a course # already exists response', (done) => {
    agent
      .put('/admin/' + COURSE_DATA.courseId )
      .send(COURSE_DATA)
      .end((err: any, res: supertest.Response) => {
        expect(res.status).to.equal(500);
        expect(JSON.stringify(res.body)).to.equal(JSON.stringify(ALREADY_EXISTS));
        if (err) {
          console.log(err);
          done(err);
        } else {
          done();
        }
      });
  });
});

describe('PUT /:courseId/admin/students', () => {
  let invalidNum = Math.floor(Math.random() * 9999956);
  const ERROR_RESULT = { err: 'Course #' + invalidNum +
    ' does not exist. Cannot add class list to course that does not exist.' };
  const SUCCESS_RESULT = { response: 'Successfully updated Class List on course #' + COURSE_DATA.courseId };

  it('should return a successfully added class list response', (done) => {
    agent
      .post('/' + COURSE_DATA.courseId + '/admin/students')
      .attach('classList', CLASS_LIST_PATH)
      .end((err, res) => {
        expect(res.status).to.equal(200);
        expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_RESULT));
        if (err) {
          console.log(err);
          done(err);
        } else {
          done();
        }
      });
  });

  it('should return an error response as class number does not exist', (done) => {
    agent
      .post('/' + invalidNum + '/admin/students')
      .attach('classList', CLASS_LIST_PATH)
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(ERROR_RESULT));
          done();
        }
      });
  });
});


