import * as chai from 'chai';
import * as supertest from 'supertest';
import { app } from '../../server';
import { logger } from '../../utils/logger';
const expect = chai.expect;

describe('user API', () => {
  describe('PUT /api/user/login', () => {
    it('should return "login"', (done) => {
      supertest(app)
        .put('/api/user/login')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('login');
            done();
          }
        });
    });
  });

  describe('PUT /api/user/logout', () => {
    it('should return "logout"', (done) => {
      supertest(app)
        .put('/api/user/logout')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('logout');
            done();
          }
        });
    });
  });
});
