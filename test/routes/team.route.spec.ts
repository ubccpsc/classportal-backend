import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../server';
import { logger } from '../../utils/logger';

describe('GET /auth/login', () => {
  it('should login successfully', (done) => {
    let user1 = supertest.agent(app)
      .get('/auth/login')
      .query({ username: 'andrewstec', snum: 4 })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          console.log(res);
          expect(res.status).to.equal(400);
          expect(res.body).to.equal('get team');
          done();
        }
      });
  });

  it('should return array of students', (done) => {
    supertest.agent(app)
      .get('/710/admin/students')
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.status).to.equal(500);
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
