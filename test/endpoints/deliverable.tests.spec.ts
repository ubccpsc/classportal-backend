import * as supertest from 'supertest';
import {expect} from 'chai';
import {app} from '../../server';
import {logger} from '../../utils/logger';
import {User, IUserDocument} from '../../app/models/user.model';
import {Team, ITeamDocument} from '../../app/models/team.model';
import {Deliverable, IDeliverableDocument} from '../../app/models/deliverable.model';
import * as mockData from '../assets/mockDataObjects';
import {studentCookie} from './../assets/auth.agents';

let agent = supertest.agent(app);

const SUCCESS_DELIVERABLE_POST = {response: 'Successfully updated/added Deliverable.'};
const ERROR_DELIVERABLE_POST = {err: 'Error assigning deliverables to course #210.'};
const VALID_DELIV_OBJECT = {
  url:            'http://www.testURL.com',
  open:           '1999-01-18T02:21:07.200Z',
  close:          '2000-01-18T04:01:55.200Z',
  gradesReleased: 1,
  name:           'Theory Assignment',
};
const INVALID_DELIV_OBJECT = {
  url:            'http://www.testURL.com',
  open:           '1999-01-18T02:21:07.200Z',
  close:          '2000-01-18T04:01:55.200Z',
  gradesReleased: 1,
};
const ERROR_VALIDATION_POST = {'err': 'Deliverable validation failed'};

mockData.initializeData()
  .then(() => console.log('data initialized'))
  .catch(err => console.log('data initialization error: ' + err));

describe('POST /:courseId/admin/deliverable', () => {

  it('should not add deliverable object, as course does not exist', (done) => {
    agent
      .post('/210/admin/deliverables')
      .send(VALID_DELIV_OBJECT)
      .set('set-cookie', studentCookie)
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.status).to.equal(500);
          expect(res.text).to.equal(JSON.stringify(ERROR_DELIVERABLE_POST));
          done();
        }
      });
  });

  it('should accept new deliverable object', (done) => {
    agent
      .post('/710/admin/deliverables')
      .set('set-cookie', studentCookie)
      .send(VALID_DELIV_OBJECT)
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.status).to.equal(200);
          expect(res.text).to.equal(JSON.stringify(SUCCESS_DELIVERABLE_POST));
          done();
        }
      });
  });

  it('should not create object; should return validation error', (done) => {
    agent
      .post('/710/admin/deliverables')
      .set('set-cookie', studentCookie)
      .send(INVALID_DELIV_OBJECT)
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.status).to.equal(500);
          expect(res.text).to.equal(JSON.stringify(ERROR_VALIDATION_POST));
          done();
        }
      });
  });
});


describe('GET /:courseId/deliverables', () => {

  it('should receieve an array of Team objects with correct payload structure', (done) => {

    agent
      .get('/710/deliverables')
      .end((err: any, res: any) => {
        if (err) {
          done(err);
        } else {
          expect(res.status).to.equal(200);
          let objects = JSON.parse(res.text);
          for (let object in objects.response[0]) {
            expect(objects.response[0][object].madeup).to.be.undefined;
            expect(objects.response[0][object].url).to.not.be.null;
            expect(objects.response[0][object].open).to.not.be.null;
            expect(objects.response[0][object].name).to.not.be.null;
            expect(objects.response[0][object].close).to.not.be.null;
          }
          done();
        }
      });
  });

});
