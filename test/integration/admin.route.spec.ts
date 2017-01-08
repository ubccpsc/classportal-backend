import * as chai from 'chai';
import * as supertest from 'supertest';
import { app } from '../../server';
import { logger } from '../../utils/logger';
const expect = chai.expect;

describe('admin API', () => {
  describe('POST /api/admin/classlist without CSV', () => {
    it('should return "no file uploaded"', (done) => {
      supertest(app)
        .post('/api/admin/classlist')
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

  xdescribe('POST /api/admin/classlist with CSV', () => {
    it('should return "update class list"', (done) => {
      supertest(app)
        .post('/api/admin/classlist')
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
