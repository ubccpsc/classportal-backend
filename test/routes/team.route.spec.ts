import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../server';
import { logger } from '../../utils/logger';
import { User, IUserDocument } from '../../app/models/user.model';

const SNUM_GITHUB_LOGIN = { username: 'thekitsch', snum: 5 };
const DUPLICATE_ENTRY_DATA = {
  'deliverable': '58ee95b9ec03e72706a11ca4',
  'members': ['58fe43146d60f13e703e9c1a', '58fe43146d60f13e703e9c1b'],
};
const USER_1_THOMAS = User.findOne({ csid: 12312321, fname: 'Thomas' }).exec();
const USER_2_CYNTHIA = User.findOne({ csid: 999999222, fname: 'Cynthia' }).exec();
const COURSE_710 = User.findOne({ courseId: '710' }).exec();
const COURSE_610 = User.findOne({ courseId: '610' }).exec();
const COURSE_510 = User.findOne({ courseId: '410' }).exec();
const COURSE_410 = User.findOne({ courseId: '510' }).exec();

let agent = supertest.agent(app);
let sessionCookie: any;

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
        expect(res.text.user.username).to.equal('thekitsch');
        done();
      });
  });
});

describe('PUT /:courseId/team', () => {
  it('should reject team creation due to duplicate team members entered', (done) => {
    agent
      .put('/710/team')
      .set('cookie', sessionCookie)
      .send(DUPLICATE_ENTRY_DATA)
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          console.log('newest test' + JSON.stringify(res));
          expect(res.status).to.equal(200);
          expect(JSON.stringify(res)).to.equal('thekitsch');
          done();
        }
      });
  });

  it('should return array of students', (done) => {
    supertest.agent(app)
      .get('/710/students')
      .end((err: any, res: supertest.Response) => {
        if (err) {
          done(err);
        } else {
          expect(res.status).to.equal(500);
          expect(res.body).to.equal('get team');
          done();
        }
      });
  });
});


xdescribe('team API', () => {

  describe('POST /api/team', () => {
    it('should return "create team"', (done) => {
      supertest(app)
        .post('/api/team')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('create team');
            done();
          }
        });
    });

    xit('should successfully create a new team', (done) => {
      supertest(app)
        .post('/api/team')
        .send({ 'members': ['mksarge', 'rtholmes'] })
        .set('Content-Type', 'application/json')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.body.username).to.equal('successfully created a team!');
            expect(res.status).to.equal(200);
            done();
          }
        });
    });

    xit('should fail to create a team with students who are already on teams', (done) => {
      supertest(app)
        .post('/api/team')
        .send({ 'members': ['mksarge', 'rtholmes'] })
        .set('Content-Type', 'application/json')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(500);
            done();
          }
        });
    });
  });

  xdescribe('DEL /api/team', () => {
    it('should return "remove team"', (done) => {
      supertest(app)
        .del('/api/team')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('remove team');
            done();
          }
        });
    });
  });

  xdescribe('GET /api/team', () => {
    it('should return "get team"', (done) => {
      supertest(app)
        .get('/api/team')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('get team');
            done();
          }
        });
    });
  });
});
