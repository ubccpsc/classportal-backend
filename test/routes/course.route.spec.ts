import * as chai from 'chai';
import * as supertest from 'supertest';
import { app } from '../../server';
import { logger } from '../../utils/logger';
let expect = chai.expect;
let assert = chai.assert;

const COURSE_DATA = {
  courseId : Math.floor(Math.random() * 99999),
  name : 'Computer Studies',
  classList : __dirname.replace('/build/test/routes', '') +
  '/test/assets/mockDataCList.csv',
  minTeamSize : '1',
  maxTeamSize : '9',
  modules : new Array(),
  customData : {},
  icon: '//cdn.ubc.ca/clf/7.0.5/img/favicon.ico',
  studentsSetTeams : 1,
  admins : ['fred', 'jimmy'],
};
let studentAgent = supertest.agent(app);

describe('PUT admin/:courseId', () => {

  const ERROR_RESULT = { err: 'Course ' + COURSE_DATA.courseId + ' already exists' };
  const SUCCESS_RESULT = { response: 'Successfully added Course #' + COURSE_DATA.courseId };
  const ALREADY_EXISTS = { err: 'Course ' + COURSE_DATA.courseId + ' already exists' };

  it('should return a successfully added course # response', (done) => {
    studentAgent
      .put('/admin/' + COURSE_DATA.courseId )
      .send({
        name : COURSE_DATA.name,
        minTeamSize : COURSE_DATA.minTeamSize,
        maxTeamSize : COURSE_DATA.maxTeamSize,
        modules : COURSE_DATA.modules,
        customData : COURSE_DATA.customData,
        icon: COURSE_DATA.icon,
        studentsSetTeams : COURSE_DATA.studentsSetTeams,
        admins : COURSE_DATA.admins,
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          console.log(res);
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_RESULT));
          done();
        }
      });
  });

  it('should return a course # already exists response', (done) => {
    studentAgent
      .put('/admin/' + COURSE_DATA.courseId )
      .send(COURSE_DATA)
      .end((err: any, res: supertest.Response) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(res.status).to.equal(500);
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(ALREADY_EXISTS));
          done();
        }
      });
  });
});

describe('PUT /:courseId/admin/students', () => {

  const ERROR_RESULT = { err: 'error' };
  const SUCCESS_RESULT = { response: 'Successfully updated Class List on course #' + COURSE_DATA.courseId };

  it('should return a successfully added class # response', (done) => {
    studentAgent
      .post('/' + COURSE_DATA.courseId + '/admin/students')
      .attach('classList', COURSE_DATA.classList)
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(res.status).to.equal(200);
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_RESULT));
          done();
        }
      });
  });
});


studentAgent
  .get('/auth/login')
  .query({ username: 'thekitsch', snum: 5 })
  .end((err, res) => {
    // user should be authenticated with session state
    if (err) {
      console.log(err);
    } else {
      console.log('logged into "thekitsch"');
    }
  });

xdescribe('class API', () => {
  describe('POST /api/class without CSV', () => {
    it('should return "no file uploaded"', (done) => {
      supertest(app)
        .post('/api/class')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(500);
            expect(res.body).to.equal('no file uploaded');
            done;
          }
        });
    });
  });

  xdescribe('POST /api/class with valid CSV', () => {
    it('should return "update class list"', (done) => {
      supertest(app)
        .post('/api/class')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('update class list');
            done();
          }
        });
    });
  });

});
