import * as supertest from 'supertest';
import {expect, assert} from 'chai';
import {app} from '../../server';
import {logger} from '../../utils/logger';
import {User} from '../../app/models/user.model';

const VALID_CSID_SNUM = {snum: '5', csid: '12312321'};
const INVALID_CSID_SNUM = {snum: '131352332', csid: '59843983'};
const GITHUB_USERNAME = 'TEST_ADMIN_1';
const ALPHA_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBER_CHARS = '1234567890';
const REAL_GITHUB_USERNAME = 'thekitsch';

let studentAgent = function () {
  let studentAgent = supertest.agent(app);

  studentAgent
    .get('/auth/login')
    .query({username: REAL_GITHUB_USERNAME, snum: 5})
    .end((err, res) => {
      // user should be authenticated with session state
      if (err) {
        console.log(err);
      }
    });

  return studentAgent;
};

function randomString(length: number, chars: string) {
  let result = '';
  for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

describe('/register', () => {

  const INVALID_CSID_RESPONSE = {err: 'Unable to validate CSID and SNUM'};
  const SUCCESS_RESPONSE = '/auth/github/register';
  const ALREADY_REGISTERED_RESPONSE = {err: 'User is already registered'};

  it('should receive redirect 302 when given valid CSID and SNUM', (done) => {
    User.findOne(VALID_CSID_SNUM).exec().then(validUser => {
      validUser.username = '';
      validUser.save().then(() => {
        supertest(app)
          .put('/register')
          .send(VALID_CSID_SNUM)
          .end((err, res) => {
            if (err) {
              console.log(err);
              done(err);
            } else {
              expect(res.status).to.equal(302);
              expect(res.header.location).to.equal(SUCCESS_RESPONSE);
              done();
            }
          });
      });
    });
  });

  it('should receive error when given invalid CSID and SNUM', (done) => {
    supertest(app)
      .put('/register')
      .send(INVALID_CSID_SNUM)
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(res.status).to.equal(500);
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(INVALID_CSID_RESPONSE));
          done();
        }
      });
  });

  it('should receive an already registered error if given pre-registered CSID and SNUM', (done) => {
    User.create({
      snum:     randomString(7, NUMBER_CHARS),
      csid:     randomString(9, NUMBER_CHARS),
      fname:    'Roger',
      lname:    'Brackendale',
      username: 'TestingAccount' + randomString(5, NUMBER_CHARS),
    })
      .then(user => {
        supertest(app)
          .put('/register')
          .send(user)
          .end((err, res) => {
            if (err) {
              console.log(err);
              done(err);
            } else {
              expect(res.status).to.equal(500);
              expect(JSON.stringify(res.body)).to.equal(JSON.stringify(ALREADY_REGISTERED_RESPONSE));
              done();
            }
          });
      });


  });
});

describe('PUT /register/username', () => {

  const ERROR_RESPONSE = {err: 'Unable to validate CSID and SNUM'};
  const SUCCESS_RESPONSE = {
    response: REAL_GITHUB_USERNAME + ' added to CSID #'
              + VALID_CSID_SNUM.csid + ' and SNUM #' + VALID_CSID_SNUM.snum + '.'
  };
  const ALREADY_REGISTERED_RESPONSE = {err: 'User is already registered'};

  it('should receive redirect 302 when given valid CSID and SNUM and Github USERNAME', (done) => {
    studentAgent()
      .put('/register/username')
      .send({
        snum:     VALID_CSID_SNUM.snum,
        csid:     VALID_CSID_SNUM.csid,
        username: REAL_GITHUB_USERNAME,
      })
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(res.status).to.equal(200);
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_RESPONSE));
          done();
        }
      });
  });

  it('should receive error when given invalid CSID and SNUM', (done) => {
    studentAgent()
      .put('/register/username')
      .send(INVALID_CSID_SNUM)
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(res.status).to.equal(500);
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(ERROR_RESPONSE));
          done();
        }
      });
  });
});
