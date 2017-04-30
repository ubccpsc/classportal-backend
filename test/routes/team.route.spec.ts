import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../server';
import { logger } from '../../utils/logger';
import { User, IUserDocument } from '../../app/models/user.model';
import * as mockData from '../assets/mockDataObjects';
import { studentCookie } from './../assets/auth.agents';

const SNUM_GITHUB_LOGIN = { username: 'thekitsch', snum: 5 };
const SUCCESS_MSG_PUT = { response : 'Successfully added a new team.' };
const SUCCESS_MSG_POST = { response : 'Successfully updated team.' };
const DUPLICATE_ERROR_MSG = { err : 'Cannot add duplicate team members to deliverable.' };
const INVALID_TEAM_ID = 'asdc1f23123f12d3qedsf';

let agent = supertest.agent(app);

mockData.initializeData()
  .then(() => console.log('data initialized'))
  .catch(err => console.log('data initialization error: ' + err));

describe('PUT /:courseId/team', () => {
  it('should accept new team creation', (done) => {
    agent
      .put('/710/team')
      .set('set-cookie', studentCookie)
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
          expect(res.text).to.equal(JSON.stringify(SUCCESS_MSG_PUT));
          done();
        }
      });
  });
});

describe('PUT /:courseId/team', () => {
  it('should not accept new team creation, as Users already exist on Team under Deliverable', (done) => {
    agent
      .put('/710/team')
      .set('set-cookie', studentCookie)
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
      .set('set-cookie', studentCookie)
      .send({
        teamId: mockData.TEAM_COMPUTATIONAL_THEORY._id,
        updatedModel : { course : mockData.COURSE_710._id, deliverable : mockData.DELIVERABLE_1._id,
          name : 'Team Name', teamId : 123456, githubUrl : 'http://github.com/url', admins : new Array(),
          members : [mockData.RANDOM_STUDENT_3._id, mockData.RANDOM_STUDENT_4._id] },
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.status).to.equal(200);
          expect(res.text).to.equal(JSON.stringify(SUCCESS_MSG_POST));
          done();
        }
      });
  });
});

describe('POST /:courseId/admin/team', () => {
  it('should accept team update with admin team members included in object', (done) => {
    agent
      .post('/710/admin/team')
      .set('set-cookie', studentCookie)
      .send({
        teamId: mockData.TEAM_COMPUTATIONAL_THEORY._id,
        updatedModel : { course : mockData.COURSE_710._id, deliverable : mockData.DELIVERABLE_1._id,
          name : 'Team Name', teamId : 123456, githubUrl : 'http://github.com/url', admins : new Array(),
          members : [mockData.RANDOM_STUDENT_3._id, mockData.RANDOM_STUDENT_4._id] },
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.status).to.equal(200);
          expect(res.text).to.equal(JSON.stringify(SUCCESS_MSG_POST));
          done();
        }
      });
  });
});

describe('POST /:courseId/admin/team', () => {
  it('should not accept team update as invalid teamId', (done) => {
    agent
      .post('/710/admin/team')
      .set('set-cookie', studentCookie)
      .send({
        teamId: '58fe2c246d533d25b63818f9',
        updatedModel : { course : mockData.COURSE_710._id, deliverable : mockData.DELIVERABLE_1._id,
          name : 'Team Name', teamId : 123456, githubUrl : 'http://github.com/url', admins : new Array(),
          members : [mockData.RANDOM_STUDENT_3._id, mockData.RANDOM_STUDENT_4._id] },
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(JSON.stringify(res)).to.equal('bla');
          expect(res.status).to.equal(200);
          expect(res.text).to.equal(JSON.stringify(SUCCESS_MSG_POST));
          done();
        }
      });
  });
});

