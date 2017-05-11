import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../server';
import { logger } from '../../utils/logger';
import { User, IUserDocument } from '../../app/models/user.model';
import { Team, ITeamDocument } from '../../app/models/team.model';
import * as mockData from '../assets/mockDataObjects';
import { studentCookie } from './../assets/auth.agents';

const TEST_ORG = 'ubccpsc-githubtest';
const REAL_GITHUB_USER = 'thekitsch';

let agent = supertest.agent(app);
let faker = require('faker');


describe('PUT /:courseId/team', () => {

  const TEAM_WITH_MEMBER = {
    orgName: TEST_ORG,
    teamName: 'Test_team_' + faker.random.number(9999),
    members: [REAL_GITHUB_USER],
  };
  const SUCCESS_RESPONSE = { response: 'Successfully created team with members.' };
  before('initialize database data', function(done) {
    mockData.initializeData()
      .then(() => console.log('data initialized'))
      .catch(err => console.log('data initialization error: ' + err));
    done();
  });

  it('api test: should create a team with team members', (done) => {
    agent
      .put('/710/admin/github/team')
      .set('set-cookie', studentCookie)
      .send(TEAM_WITH_MEMBER)
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.status).to.equal(200);
          expect(res.text).to.equal(JSON.stringify(SUCCESS_RESPONSE));
          done();
        }
      });
  });

});