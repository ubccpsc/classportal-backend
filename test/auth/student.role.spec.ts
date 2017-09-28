import * as supertest from 'supertest';
import {expect} from 'chai';
import {app} from '../../server';
import {logger} from '../../utils/logger';
import {User, IUserDocument} from '../../app/models/user.model';
import {studentCookie} from './../assets/auth.agents';
import * as mockData from './../assets/mockDataObjects';


const LOCAL_STUDENT_LOGIN = {username: 'thekitsch', snum: 5};

let agent = supertest.agent(app);

describe('Logging in agent for Team Routes Tests', () => {
  it('should have username in Response after logging in', (done) => {
    agent
      .get('/auth/login?username=' + mockData.LOCAL_STUDENT_LOGIN.username + '&snum=' +
        mockData.LOCAL_STUDENT_LOGIN.snum)
      .end((err, res: any) => {
        // user should be authenticated with session state
        if (err) {
          console.log(err);
        }
        console.log(JSON.stringify(res, null, 2));
        console.log(JSON.stringify(res.headers, null, 2));
        expect(res.status).to.equal(200);
        expect(JSON.parse(res.text).user.username).to.equal('thekitsch');
        done();
      });
  });
});
