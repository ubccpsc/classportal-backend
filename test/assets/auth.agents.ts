import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../server';
import { logger } from '../../utils/logger';
import { User, IUserDocument } from '../../app/models/user.model';
import * as mockData from '../assets/mockDataObjects';

const SNUM_GITHUB_LOGIN = { username: 'thekitsch', snum: 5 };
const SUCCESS_MSG_PUT = { response : 'Successfully added a new team.' };
const SUCCESS_MSG_POST = { response : 'Successfully updated team.' };
const DUPLICATE_ERROR_MSG = { err : 'Cannot add duplicate team members to deliverable.' };
const INVALID_TEAM_ID = 'asdc1f23123f12d3qedsf';

let agent = supertest.agent(app);
let studentCookie: any;
let adminCookie: any;
let superAdminCookie: any;
let bearerToken: any;

mockData.initializeData()
  .then(() => console.log('data initialized'))
  .catch(err => console.log('data initialization error: ' + err));

agent
  .get('/auth/login?username=' + mockData.LOCAL_STUDENT_LOGIN.username +
  '&snum=' + mockData.LOCAL_STUDENT_LOGIN.snum)
  .end((err, res: any) => {
    // user should be authenticated with session state
    if (err) {
      console.log(err);
    }
    studentCookie = res.headers['set-cookie'];
  });

agent
  .get('/auth/login?username=' + mockData.LOCAL_STUDENT_LOGIN.username +
  '&snum=' + mockData.LOCAL_STUDENT_LOGIN.snum)
  .end((err, res: any) => {
    // user should be authenticated with session state
    if (err) {
      console.log(err);
    }
    studentCookie = res.headers['set-cookie'];
  });



export { studentCookie, adminCookie, superAdminCookie };