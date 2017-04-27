import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../server';
import { logger } from '../../utils/logger';
import { User, IUserDocument } from '../../app/models/user.model';
import * as mockData from '../assets/mockDataObjects';

const SNUM_GITHUB_LOGIN = { username: 'thekitsch', snum: 5 };
const DUPLICATE_ENTRY_DATA = {
  'deliverable': '58ee95b9ec03e72706a11ca4',
  'members': ['58fe43146d60f13e703e9c1a', '58fe43146d60f13e703e9c1b'],
};

let agent = supertest.agent(app);
let sessionCookie: any;

mockData.initializeData();

describe('Logging in agent for Team Routes Tests', () => {
  it('should have username in Response after logging in', (done) => {
    agent
      .get('/auth/login?username=' + SNUM_GITHUB_LOGIN.username + '&snum=' + SNUM_GITHUB_LOGIN.snum)
      .end((err, res: any) => {
        // user should be authenticated with session state
        if (err) {
          console.log(err);
        }
        sessionCookie = res.headers['set-cookie'];
        expect(res.status).to.equal(200);
        expect(JSON.parse(res.text).user.username).to.equal('thekitsch');
        done();
      });
  });
});

describe('PUT /:courseId/team', () => {
  it('should accept new team creation', (done) => {
    agent
      .put('/710/team')
      .set('cookie', sessionCookie)
      .send({
        deliverable: mockData.DELIVERABLE_1,
        members: [mockData.USER_4_CONNOR._id, mockData.USER_5_AGENT],
      })
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          console.log('newest test' + JSON.stringify(res));
          expect(res.status).to.equal(200);
          expect(JSON.parse(res.text).response).to.equal('Successfully added a new team.');
          done();
        }
      });
  });
});
