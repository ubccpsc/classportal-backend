import * as chai from 'chai';
import * as supertest from 'supertest';
import { app } from '../../server';
import { logger } from '../../utils/logger';
const expect = chai.expect;

describe('portal API', () => {
  describe('GET /api/portal without admin credentials', () => {
    it('should return "student"', (done) => {
      supertest(app)
        .get('/api/portal')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body.student.username).to.equal('mksarge');
            done();
          }
        });
    });
  });
});
