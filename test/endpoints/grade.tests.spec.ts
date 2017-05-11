import * as chai from 'chai';
import * as supertest from 'supertest';
import { app } from '../../server';
import { logger } from '../../utils/logger';
import { Grade, IGradeDocument } from '../../app/models/grade.model';
import { Deliverable, IDeliverableModel } from '../../app/models/deliverable.model';
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

describe('initialize db data and remove Grades in DB', () => {
  before( (done) => {
    mockData.initializeData()
    .then( () => {
      Grade.remove({}).exec();
    })
    .then(() => { return done(); })
    .catch(err => console.log('data initialization error: ' + err));
  });
});

describe('POST /:courseId/admin/grades/:delivId', () => {

  const GRADES_CSV_FILE = String(__dirname).replace('/build/test/endpoints', '/test/assets/CSVs/mockGrades.csv');
  const SUCCESS_RESPONSE_ADD_GRADES = { response: 'Successfully added CSV list of grades.' };

  let DELIV_ID: string;

  before( (done) => {
    Deliverable.findOne({ name: 'Assignment 1' })
      .then( d => {
        DELIV_ID = d.name;
        return done();
      });
  });

  it('should post a list of grades', (done) => {
    studentAgent()
      .post('/710/admin/grades/' + DELIV_ID)
      .attach('grades', GRADES_CSV_FILE)
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(res.status).to.equal(200);
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_RESPONSE_ADD_GRADES));
          done();
        }
      });
  });

});

describe('POST /:courseId/admin/grades', () => {

  const SUCCESS_RESPONSE_ADD_GRADES = { response: 'Successfully updated grades.' };
  const ERROR_RESPONSE_ADD_GRADES = {};
  const NEW_GRADES_POST = {
    courseId: 710,
    grades: [
      {
        snum: 333,
        deliv: 'Assignment 2',
        details: { finalGrade: '22' },
      },
      {
        snum: 444,
        deliv: 'Assignment 1',
        details: { finalGrade: '11' },
      },
    ],
  };
  const UPDATED_GRADES_POST = {
    courseId: 710,
    grades: [
      {
        snum: 333,
        deliv: 'Assignment 2',
        details: { finalGrade: '12' },
      },
      {
        snum: 444,
        deliv: 'Assignment 1',
        details: { finalGrade: '21' },
      },
    ],
  };
  const MORE_GRADES_POST = {
    courseId: 710,
    grades: [
      {
        snum: 333,
        deliv: 'Assignment 1',
        details: { finalGrade: '12' },
      },
      {
        snum: 444,
        deliv: 'Assignment 2',
        details: { finalGrade: '21' },
      },
    ],
  };


  it('should post some grades', (done) => {
    studentAgent()
      .post('/710/admin/grades')
      .send(NEW_GRADES_POST)
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          // expect(res.status).to.equal(200);
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_RESPONSE_ADD_GRADES));
          done();
        }
      });
  });

  it('should update grades that have previously been posted', (done) => {
    studentAgent()
      .post('/710/admin/grades')
      .send(UPDATED_GRADES_POST)
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          // expect(res.status).to.equal(200);
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_RESPONSE_ADD_GRADES));
          done();
        }
      });
  });

  it('should update grades without deleting previously submitted grades', (done) => {
    studentAgent()
      .post('/710/admin/grades')
      .send(MORE_GRADES_POST)
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          // expect(res.status).to.equal(200);
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_RESPONSE_ADD_GRADES));
          done();
        }
      });
  });
});

describe('GET /:courseId/admin/grades', () => {

  const SUCCESS_GET_GRADES_JSON = { 'response' : [{ 'snum' : '333' , 'deliv': 'Assignment 2',
    'details': { 'finalGrade': '12' } }, { 'snum': '444', 'deliv': 'Assignment 1',
      'details': { 'finalGrade': '21' } }] };
  const SUCCESS_CSV_TEXT = 'snum,grade\n333,12\n444,21\n';

  it('should receive a list of snums and grades in a JSON array', (done) => {
    studentAgent()
      .get('/710/admin/grades')
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(res.status).to.equal(200);
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_GET_GRADES_JSON));
          done();
        }
      });
  });

  it('should receive a list of snums and grades in CSV format', (done) => {
    studentAgent()
      .get('/710/admin/grades?format=csv')
      .end((err, res: any) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(res.status).to.equal(200);
          console.log('the response' + JSON.stringify(res.headers));
          expect(JSON.stringify(res.header).indexOf('text/csv')).to.be.greaterThan(1);
          expect(JSON.stringify(res.text)).to.be.equal(JSON.stringify(SUCCESS_CSV_TEXT));
          done();
        }
      });
  });
});