import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../server';
import { logger } from '../../utils/logger';

describe('GET /some-error-route', () => {
  it('expect MethodNotAllowedError, GET is not allowed', function(done) {
    supertest.agent(app)
      .get('/some-error-route')
      .expect('Content-type', /json/)
      .expect(405)
      .end(function(err: any, res: any) {
        if (!err) {
          console.log('Error in /some-error-route: ' + err);
        }
        expect(res.status).to.equal(405);
        expect(res.body.error).to.equal(undefined);
        expect(res.body.message).to.equal('GET is not allowed');
        done();
      });
  });
});
