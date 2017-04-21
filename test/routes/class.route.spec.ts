import * as chai from 'chai';
import * as supertest from 'supertest';
import { app } from '../../server';
import { logger } from '../../utils/logger';
const expect = chai.expect;

let studentAgent = supertest.agent(app);

describe('POST admin/:courseId/grades', () => {
  it('should return a successfully added class # response', (done) => {
    let course = {
      courseId : '710',
      classList : __dirname.replace('/build/test/routes', '') +
      '/test/assets/mockDataCList.csv',
      minTeamSize : '1',
      maxTeamSize : '9',
      customData : {},
      studentsSetTeams : 1,
      admins : ['fred', 'jimmy'],
    };
    studentAgent
      .post('admin/' + course.courseId + '/grades')
      .field('test', 'test')
      .field('test2', 'test2')
      .attach('csv', course.classList)
      .end((err, res) => {
        if (err) {
          console.log(err);
        } else {
          expect(res.status).to.equal(200);
          expect(res.body).to.equal('Successfully added CPSC #' + course.courseId );
        }
      });
  });
});

studentAgent
  .get('/auth/login')
  .query({ username: 'thekitsch', snum: 5 })
  .end((err, res) => {
    // user should be authenticated with session state
    if (err) {
      console.log(err);
    } else {
      console.log('logged into "thekitsch"');
    }
  });

xdescribe('class API', () => {
  describe('POST /api/class without CSV', () => {
    it('should return "no file uploaded"', (done) => {
      supertest(app)
        .post('/api/class')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(500);
            expect(res.body).to.equal('no file uploaded');
            done();
          }
        });
    });
  });

  xdescribe('POST /api/class with valid CSV', () => {
    it('should return "update class list"', (done) => {
      supertest(app)
        .post('/api/class')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('update class list');
            done();
          }
        });
    });
  });

});
