import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../server';
import { logger } from '../../utils/logger';
let passport = require('passport');

let strategy = passport._strategies['github'];

strategy._token_response = {
  access_token: 'at-1234',
  expires_in: 3600,
};

strategy._profile = {
  _id: 1234,
  username: 'TEST_ADMIN_1',
  csid: '12213as',
  snum: '4',
  userrole: 'admin',
  provider: 'github',
  displayName: 'Andrew Stec',
  emails: [{ value: 'faux.andrew@fauxemailaddress.com' }],
};

let agent: any;

describe('GET /auth/login/github', () => {
  it('should return "get team"', (done) => {
    agent = supertest.agent(app)
      .get('/auth/login/github')
      .send({ username: 'TEST_ADMIN_1' })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          console.log(res);
          done(err);
        } else {
          console.log(res);
          expect(res.status).to.equal(200);
          expect(res.body).to.equal('get team');
          done();
        }
      });
  });

  it('should return array of students', (done) => {
    agent
      .get('/710/admin/students')
      .end((err: any, res: supertest.Response) => {
        if (err) {
          console.log(res);
          done(err);
        } else {
          console.log(res);
          expect(res.status).to.equal(200);
          expect(res.body).to.equal('get team');
          done();
        }
      });
  });
});


xdescribe('team API', () => {

  describe('POST /api/team', () => {
    it('should return "create team"', (done) => {
      supertest(app)
        .post('/api/team')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('create team');
            done();
          }
        });
    });

    xit('should successfully create a new team', (done) => {
      supertest(app)
        .post('/api/team')
        .send({ 'members': ['mksarge', 'rtholmes'] })
        .set('Content-Type', 'application/json')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.body.username).to.equal('successfully created a team!');
            expect(res.status).to.equal(200);
            done();
          }
        });
    });

    xit('should fail to create a team with students who are already on teams', (done) => {
      supertest(app)
        .post('/api/team')
        .send({ 'members': ['mksarge', 'rtholmes'] })
        .set('Content-Type', 'application/json')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(500);
            done();
          }
        });
    });
  });

  describe('DEL /api/team', () => {
    it('should return "remove team"', (done) => {
      supertest(app)
        .del('/api/team')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('remove team');
            done();
          }
        });
    });
  });

  describe('GET /api/team', () => {
    it('should return "get team"', (done) => {
      supertest(app)
        .get('/api/team')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('get team');
            done();
          }
        });
    });
  });
});
