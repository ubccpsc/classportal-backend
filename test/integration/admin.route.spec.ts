import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../server';
import { logger } from '../../utils/logger';

describe('admin API', () => {
  describe('GET /api/admin', () => {
    it('should return "get admin"', (done) => {
      supertest(app)
        .get('/api/admin')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('get admin');
            done();
          }
        });
    });
  });

  describe('POST /api/admin', () => {
    it('should successfully create a new admin', (done) => {
      const admin = {
        username: 'admin',
        lastname: 'Ad',
        firstname: 'Min',
      };
      supertest(app)
        .post('/api/admin')
        .send(admin)
        .set('Content-Type', 'application/json')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.body.username).to.equal('admin');
            expect(res.body.lastname).to.equal('Ad');
            expect(res.body.firstname).to.equal('Min');
            expect(res.status).to.equal(200);
            done();
          }
        });
    });
  });

  describe('DEL /api/admin', () => {
    it('should return "remove admin"', (done) => {
      supertest(app)
        .del('/api/admin')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('remove admin');
            done();
          }
        });
    });
  });

  describe('GET /api/admin', () => {
    it('should return "get admin"', (done) => {
      supertest(app)
        .get('/api/admin')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('get admin');
            done();
          }
        });
    });
  });
});
