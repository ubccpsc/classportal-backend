import * as chai from 'chai';
import * as supertest from 'supertest';
import { app } from '../../server';
import { logger } from '../../utils/logger';
const expect = chai.expect;

describe('register API', () => {
  describe('POST /api/register', () => {
    it('should return "register"', (done) => {
      supertest(app)
        .post('/api/register')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('register');
            done();
          }
        });
    });
  });
});
