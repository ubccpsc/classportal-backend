import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../server';
import { logger } from '../../utils/logger';
import { User, IUserDocument } from '../../app/models/user.model';
import * as mockData from '../assets/mockDataObjects';

const SNUM_GITHUB_LOGIN = { username: 'thekitsch', snum: 5 };
const SUCCESS_MSG = { response  : 'Successfully added a new team.' };
const DUPLICATE_ERROR_MSG = { err : 'Cannot add duplicate team members to deliverable.' };

let agent = supertest.agent(app);
let sessionCookie: any;
let bearerToken: any;

mockData.initializeData()
  .then(() => console.log('data initialized'))
  .catch(err => console.log('data initialization error: ' + err));

describe('Logging in agent for Team Routes Tests', () => {
  it('should have username in Response after logging in', (done) => {
    agent
      .get('/auth/login?username=' + SNUM_GITHUB_LOGIN.username + '&snum=' + SNUM_GITHUB_LOGIN.snum)
      .end((err, res: any) => {
        // user should be authenticated with session state
        if (err) {
          console.log(err);
        }
        console.log(JSON.stringify(res, null, 2));
        console.log(JSON.stringify(res.headers, null, 2));
        sessionCookie = res.headers['set-cookie'];
        expect(res.status).to.equal(200);
        expect(JSON.parse(res.text).user.username).to.equal('thekitsch');
        done();
      });
  });
});

describe('PUT /:courseId/team', () => {
  it('should accept new team creation', (done) => {
    agent
      .put('/710/team')
      .set('set-cookie', sessionCookie)
      .send({
        deliverable: mockData.DELIVERABLE_1,
        members: [mockData.RANDOM_STUDENT_1._id, mockData.RANDOM_STUDENT_2._id],
        githubUrl: mockData.GITHUB_URL,
        name: mockData.TEAM_NAME,
        teamId: mockData.TEAM_ID,
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.status).to.equal(200);
          expect(res.text).to.equal(JSON.stringify(SUCCESS_MSG));
          done();
        }
      });
  });
});

describe('PUT /:courseId/team', () => {
  it('should not accept new team creation, as Users already exist on Team under Deliverable', (done) => {
    agent
      .put('/710/team')
      .set('set-cookie', sessionCookie)
      .send({
        deliverable: mockData.DELIVERABLE_1,
        members: [mockData.RANDOM_STUDENT_1._id, mockData.RANDOM_STUDENT_2._id],
        githubUrl: mockData.GITHUB_URL,
        name: mockData.TEAM_NAME,
        teamId: mockData.TEAM_ID,
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.status).to.equal(500);
          expect(res.text).to.equal(JSON.stringify(DUPLICATE_ERROR_MSG));
          done();
        }
      });
  });
});

describe('POST /:courseId/admin/team', () => {
  it('should accept team update with admin team members included in object', (done) => {
    agent
      .post('/710/admin/team')
      .set('set-cookie', sessionCookie)
      .send({
        deliverable: mockData.DELIVERABLE_1,
        members: [mockData.RANDOM_STUDENT_3._id, mockData.RANDOM_STUDENT_4._id],
        githubUrl: mockData.GITHUB_URL,
        name: mockData.TEAM_NAME,
        teamId: mockData.TEAM_ID,
        admins: mockData.TEAM_ADMINS,
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(JSON.stringify(res)).to.equal('bla');
          expect(res.status).to.equal(200);
          expect(res.text).to.equal(JSON.stringify(SUCCESS_MSG));
          done();
        }
      });
  });
});