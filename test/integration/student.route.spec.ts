import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../server';
import { logger } from '../../utils/logger';
import { Student } from '../../app/models/student.model';

describe('student API', () => {

  before((done) => {
    Student.remove({}, () => {
      logger.trace('Test db: Student collection removed!');
      done();
    });
  });

  describe('POST /api/student', () => {
    it('should successfully create a new student', (done) => {
      const student = {
        csid: 'a1a1',
        snum: '00000001',
        lastname: 'Sargent',
        firstname: 'Michael',
      };
      supertest(app)
        .post('/api/student')
        .send(student)
        .set('Content-Type', 'application/json')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.body.csid).to.equal('a1a1');
            expect(res.status).to.equal(200);
            done();
          }
        });
    });

    it('should fail to create the same student twice', (done) => {
      const student = {
        csid: 'a1a1',
        snum: '00000001',
        lastname: 'Sargent',
        firstname: 'Michael',
      };
      supertest(app)
        .post('/api/student')
        .send(student)
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

    it('should fail to create a student with inadequate info', (done) => {
      const student = {
        csid: 'b2b2',
      };
      supertest(app)
        .post('/api/student')
        .send(student)
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

  describe('POST /api/register', () => {
    it('should successfully register an existing student', (done) => {
      supertest(app)
        .post('/api/register')
        .send({
          csid: 'a1a1',
          snum: '00000001',
          token: 'mksarge'
        })
        .set('Content-Type', 'application/json')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.body.username).to.equal('mksarge');
            expect(res.status).to.equal(200);
            done();
          }
        });
    });
  });


  describe('PUT /api/student/:username', () => {
    it('should successfully update existing student', (done) => {
      supertest(app)
        .put('/api/student/mksarge')
        .send({ 'newUsername': 'nathan' })
        .set('Content-Type', 'application/json')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.body.username).to.equal('nathan');
            expect(res.status).to.equal(200);
            done();
          }
        });
    });

    it('should fail to update invalid student', (done) => {
      supertest(app)
        .put('/api/student/mksarge')
        .send({ 'newUsername': 'nathan' })
        .set('Content-Type', 'application/json')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.body.username).to.be.undefined;
            expect(res.status).to.equal(500);
            done();
          }
        });
    });
  });


  describe('GET /api/student', () => {
    it('should get valid student', (done) => {
      supertest(app)
        .get('/api/student/nathan')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.body.username).to.equal('nathan');
            expect(res.status).to.equal(200);
            done();
          }
        });
    });

    it('should fail to get invalid student', (done) => {
      supertest(app)
        .get('/api/student/mksarge')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.body.username).to.be.undefined;
            expect(res.status).to.equal(500);
            done();
          }
        });
    });
  });

  describe('DEL /api/student', () => {
    it('should successfully delete valid student', (done) => {
      supertest(app)
        .del('/api/student/nathan')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.body.username).to.equal('nathan');
            expect(res.status).to.equal(200);
            done();
          }
        });
    });

    it('should fail to delete invalid student', (done) => {
      supertest(app)
        .del('/api/student/nathan')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.body.username).to.be.undefined;
            expect(res.status).to.equal(500);
            done();
          }
        });
    });
  });
});
