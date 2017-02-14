import * as chai from 'chai';
import * as supertest from 'supertest';
import { app } from '../../server';
import { logger } from '../../utils/logger';
const expect = chai.expect;

xdescribe('class API', () => {
  describe('POST /api/class without CSV', () => {
    it('should return "no file uploaded"', (done) => {
      supertest(app)
        .post('/api/class')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(500);
            expect(res.body).to.equal('no file uploaded');
            done();
          }
        });
    });
  });

  xdescribe('POST /api/class with valid CSV', () => {
    it('should return "update class list"', (done) => {
      supertest(app)
        .post('/api/class')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('update class list');
            done();
          }
        });
    });
  });

});
