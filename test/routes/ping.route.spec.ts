import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../server';
import { logger } from '../../utils/logger';

describe('ping API', () => {
  describe('GET /ping', () => {
    it('should return "pong"', (done) => {
      supertest(app)
        .get('/ping')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('pong');
            done();
          }
        });
    });
  });
});
