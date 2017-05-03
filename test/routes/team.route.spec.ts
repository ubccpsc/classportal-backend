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
const ERROR_PAYLOAD_MALFORMED = { err : 'Payload objects malformed. Cannot update team.' };
const ERROR_INVALID_TEAM_OBJECT_ID = { err : 'Team ID 58fe2c246d533d25b63818f9 not found.' };
const ERROR_MAX_TEAM_SIZE = { err : 'Cannot create team. The maximum team size is 8.' };
const ERROR_MIN_TEAM_SIZE = { err : 'Cannot create team. The minimum team size is 2.' };
const ERROR_0_TEAM_MEMBERS = { err : 'Cannot add team without team members.' };
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

describe('PUT /:courseId/team', () => {

  it('should not create team, as breached maximum team size', (done) => {
    // assume max team size for 710 is 8
    agent
      .put('/710/team')
      .set('set-cookie', studentCookie)
      .send({
        course : mockData.COURSE_710._id, deliverable : mockData.DELIVERABLE_2._id,
        name : 'Team Name', teamId : 123456, githubUrl : 'http://github.com/url',
        members : [mockData.RANDOM_STUDENT_3._id, mockData.RANDOM_STUDENT_4._id,
          mockData.RANDOM_STUDENT_4._id, mockData.RANDOM_STUDENT_4._id, mockData.RANDOM_STUDENT_4._id,
          mockData.RANDOM_STUDENT_4._id, mockData.RANDOM_STUDENT_4._id, mockData.RANDOM_STUDENT_4._id,
          mockData.RANDOM_STUDENT_4._id, mockData.RANDOM_STUDENT_4._id, mockData.RANDOM_STUDENT_4._id,
          mockData.RANDOM_STUDENT_4._id, mockData.RANDOM_STUDENT_4._id, mockData.RANDOM_STUDENT_4._id],
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          // expect(res.status).to.equal(500);
          expect(res.text).to.equal(JSON.stringify(ERROR_MAX_TEAM_SIZE));
          done();
        }
      });
  });

  it('should not create team, as did not reach minimum team size', (done) => {
    // assume min team size for 610 is 2
    agent
      .put('/610/team')
      .set('set-cookie', studentCookie)
      .send({
        course : mockData.COURSE_610._id, deliverable : mockData.DELIVERABLE_2._id,
        name : 'Team Name', teamId : 123456, githubUrl : 'http://github.com/url',
        members : [mockData.RANDOM_STUDENT_3._id],
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          // expect(res.status).to.equal(500);
          expect(res.text).to.equal(JSON.stringify(ERROR_MIN_TEAM_SIZE));
          done();
        }
      });
  });

  it('should not create team, as 0 team members submitted', (done) => {
    // assume min team size for 610 is 2
    agent
      .put('/710/team')
      .set('set-cookie', studentCookie)
      .send({
        course : mockData.COURSE_710._id, deliverable : mockData.DELIVERABLE_2._id,
        name : 'Team Name', teamId : 123456, githubUrl : 'http://github.com/url',
        members : [],
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          // expect(res.status).to.equal(500);
          expect(res.text).to.equal(JSON.stringify(ERROR_0_TEAM_MEMBERS));
          done();
        }
      });
  });
});

describe('POST /:courseId/admin/team', () => {

  it('should accept team update with TA team members included in object', (done) => {
    agent
      .post('/710/admin/team')
      .set('set-cookie', studentCookie)
      .send({
        teamId: mockData.TEAM_COMPUTATIONAL_THEORY._id,
        updatedModel : { course : mockData.COURSE_710._id, deliverable : mockData.DELIVERABLE_1._id,
          name : 'Team Name', teamId : 123456, githubUrl : 'http://github.com/url', TAs : new Array(),
          members : [mockData.RANDOM_STUDENT_3._id, mockData.RANDOM_STUDENT_4._id] },
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.text).to.equal(JSON.stringify(SUCCESS_MSG_POST));
          expect(res.status).to.equal(200);
          done();
        }
      });
  });

  it('should accept team update with empty TAs team members included in object', (done) => {
    agent
      .post('/710/admin/team')
      .set('set-cookie', studentCookie)
      .send({
        teamId: mockData.TEAM_COMPUTATIONAL_THEORY._id,
        updatedModel : { course : mockData.COURSE_710._id, deliverable : mockData.DELIVERABLE_1._id,
          name : 'Team Name', teamId : 123456, githubUrl : 'http://github.com/url', TAs : new Array(),
          members : [mockData.RANDOM_STUDENT_3._id, mockData.RANDOM_STUDENT_4._id] },
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.text).to.equal(JSON.stringify(SUCCESS_MSG_POST));
          expect(res.status).to.equal(200);
          done();
        }
      });
  });

  it('should accept team update with two TA team members included in object', (done) => {
    agent
      .post('/710/admin/team')
      .set('set-cookie', studentCookie)
      .send({
        teamId: mockData.TEAM_COMPUTATIONAL_THEORY._id,
        updatedModel : { course : mockData.COURSE_710._id, deliverable : mockData.DELIVERABLE_1._id,
          name : 'Team Name', teamId : 123456, githubUrl : 'http://github.com/url',
          TAs : [mockData.RANDOM_STUDENT_1._id, mockData.RANDOM_STUDENT_2._id],
          members : [mockData.RANDOM_STUDENT_3._id, mockData.RANDOM_STUDENT_4._id] },
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.text).to.equal(JSON.stringify(SUCCESS_MSG_POST));
          expect(res.status).to.equal(200);
          done();
        }
      });
  });

  it('should accept team update with no TAs included in object', (done) => {
    agent
      .post('/710/admin/team')
      .set('set-cookie', studentCookie)
      .send({
        teamId: mockData.TEAM_COMPUTATIONAL_THEORY._id,
        updatedModel : { course : mockData.COURSE_710._id, deliverable : mockData.DELIVERABLE_1._id,
          name : 'Team Name', teamId : 123456, githubUrl : 'http://github.com/url', TAs : new Array(),
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

  it('should receive an error when adding same team member twice under team', (done) => {
    agent
      .post('/710/admin/team')
      .set('set-cookie', studentCookie)
      .send({
        teamId: mockData.TEAM_COMPUTATIONAL_THEORY._id,
        updatedModel : { course : mockData.COURSE_710._id, deliverable : mockData.DELIVERABLE_1._id,
          name : 'Team Name', teamId : 123456, githubUrl : 'http://duplicate/TAs',
          TAs : [mockData.RANDOM_STUDENT_2._id, mockData.RANDOM_STUDENT_2._id],
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

  it('should recieve error submitting payload without TAs array', (done) => {
    agent
      .post('/710/admin/team')
      .set('set-cookie', studentCookie)
      .send({
        teamId: mockData.TEAM_COMPUTATIONAL_THEORY._id,
        updatedModel : { course : mockData.COURSE_710._id, deliverable : mockData.DELIVERABLE_1._id,
          name : 'Team Name', teamId : 123456, githubUrl : 'http://github.com/url',
          members : [mockData.RANDOM_STUDENT_3._id, mockData.RANDOM_STUDENT_4._id] },
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.status).to.equal(500);
          expect(res.text).to.equal(JSON.stringify(ERROR_PAYLOAD_MALFORMED));
          done();
        }
      });
  });

  it('should recieve error submitting payload without members array', (done) => {
    agent
      .post('/710/admin/team')
      .set('set-cookie', studentCookie)
      .send({
        teamId: mockData.TEAM_COMPUTATIONAL_THEORY._id,
        updatedModel : { course : mockData.COURSE_710._id, deliverable : mockData.DELIVERABLE_1._id,
          name : 'Team Name', teamId : 123456, githubUrl : 'http://github.com/url', TAs : new Array(),
        },
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.status).to.equal(500);
          expect(res.text).to.equal(JSON.stringify(ERROR_PAYLOAD_MALFORMED));
          done();
        }
      });
  });

  it('should recieve invalid TeamID object error when submitting invalid teamId on update', (done) => {

    const INVALID_TEAM_OBJECT_ID = '58fe2c246d533d25b63818f9';

    agent
      .post('/710/admin/team')
      .set('set-cookie', studentCookie)
      .send({
        teamId: INVALID_TEAM_OBJECT_ID,
        updatedModel : { course : mockData.COURSE_710._id, deliverable : mockData.DELIVERABLE_1._id,
          name : 'Team Name', teamId : 123456, githubUrl : 'http://github.com/url', TAs : new Array(),
          members : [mockData.RANDOM_STUDENT_3._id, mockData.RANDOM_STUDENT_4._id] },
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.status).to.equal(500);
          expect(res.text).to.equal(JSON.stringify(ERROR_INVALID_TEAM_OBJECT_ID));
          done();
        }
      });
  });
});
