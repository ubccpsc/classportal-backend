import * as chai from 'chai';
import * as supertest from 'supertest';
import { app } from '../../server';
import { logger } from '../../utils/logger';
const expect = chai.expect;
import { studentCookie } from './../assets/auth.agents';
import * as mockData from '../assets/mockDataObjects';

let studentAgent = function() {
  let studentAgent = supertest.agent(app);

  studentAgent
    .get('/auth/login')
    .query({ username: mockData.REAL_GITHUB_USERNAME, snum: 5 })
    .end((err, res) => {
      // user should be authenticated with session state
      if (err) {
        console.log(err);
      }
    });

  return studentAgent;
};

describe('INITIALIZE DATA FOR GRADE TESTS', () => {
  before( (done) => {
    mockData.initializeData()
    .then(() => { return done(); })
    .catch(err => console.log('data initialization error: ' + err));
  });
});

describe('POST /:courseId/admin/grades', () => {
  
  const SUCCESS_RESPONSE_ADD_GRADES = {};
  const ERROR_RESPONSE_ADD_GRADES = {};

  it('should post some grades', (done) => {
    studentAgent()
      .post('/710/admin/grades')
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(res.status).to.equal(200);
          expect(JSON.stringify(res.body)).to.equal(SUCCESS_RESPONSE_ADD_GRADES);
          done();
        }
      });
  });

  it('should update grades that have previously been posted', (done) => {
    studentAgent()
      .post('/710/admin/grades')
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(res.status).to.equal(500);
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_RESPONSE_ADD_GRADES));
          done();
        }
      });
  });

  it('should update grades without deleting previously submitted grades', (done) => {
    studentAgent()
      .post('/710/admin/grades')
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(res.status).to.equal(500);
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_RESPONSE_ADD_GRADES));
          done();
        }
      });
  });
});

describe('GET /:courseId/admin/grades', () => {
  
  const SUCCESS_SNUM_GRADES = {};
  const SUCCESS_CSV_BODY = {};
  const SUCCESS_CSV_HEADER = {};

  it('should receive a list of snums and grades in a JSON array', (done) => {
    studentAgent()
      .get('/710/admin/grades')
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(res.status).to.equal(200);
          expect(JSON.stringify(res.body)).to.equal(SUCCESS_SNUM_GRADES);
          done();
        }
      });
  });

  it('should receive a list of snums and grades in CSV format', (done) => {
    studentAgent()
      .get('/710/admin/grades?format=csv')
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(res.status).to.equal(500);
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_CSV_BODY));
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_CSV_HEADER));
          done();
        }
      });
  });
});
