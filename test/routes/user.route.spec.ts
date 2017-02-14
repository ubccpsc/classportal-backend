import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../server';
import { logger } from '../../utils/logger';
import { User } from '../../app/models/user.model';

describe('user API', () => {

  before((done) => {
    User.remove({}, () => {
      logger.trace('Test db: User collection removed!');
      done();
    });
  });

  describe('POST /api/user', () => {
    it('should successfully create a new user', (done) => {
      const user = {
        csid: 'a1a1',
        snum: '00000001',
        lastname: 'Sargent',
        firstname: 'Michael',
      };
      supertest(app)
        .post('/api/user')
        .send(user)
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

    it('should fail to create the same user twice', (done) => {
      const user = {
        csid: 'a1a1',
        snum: '00000001',
        lastname: 'Sargent',
        firstname: 'Michael',
      };
      supertest(app)
        .post('/api/user')
        .send(user)
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

    it('should fail to create a user with inadequate info', (done) => {
      const user = {
        csid: 'b2b2',
      };
      supertest(app)
        .post('/api/user')
        .send(user)
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
    it('should successfully register an existing user', (done) => {
      supertest(app)
        .post('/api/register')
        .send({
          csid: 'a1a1',
          snum: '00000001',
          token: 'mksarge',
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


  describe('PUT /api/user/:username', () => {
    it('should successfully update existing user', (done) => {
      supertest(app)
        .put('/api/user/mksarge')
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

    it('should fail to update invalid user', (done) => {
      supertest(app)
        .put('/api/user/mksarge')
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


  describe('GET /api/user', () => {
    it('should get valid user', (done) => {
      supertest(app)
        .get('/api/user/nathan')
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

    it('should fail to get invalid user', (done) => {
      supertest(app)
        .get('/api/user/mksarge')
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

  describe('DEL /api/user', () => {
    it('should successfully delete valid user', (done) => {
      supertest(app)
        .del('/api/user/nathan')
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

    it('should fail to delete invalid user', (done) => {
      supertest(app)
        .del('/api/user/nathan')
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

describe('admin API', () => {
  describe('GET /api/admin', () => {
    it('should return "get admin"', (done) => {
      supertest(app)
        .get('/api/admin')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('get admin');
            done();
          }
        });
    });
  });

  describe('POST /api/admin', () => {
    it('should successfully create a new admin', (done) => {
      const admin = {
        username: 'admin',
        lastname: 'Ad',
        firstname: 'Min',
      };
      supertest(app)
        .post('/api/admin')
        .send(admin)
        .set('Content-Type', 'application/json')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.body.username).to.equal('admin');
            expect(res.body.lastname).to.equal('Ad');
            expect(res.body.firstname).to.equal('Min');
            expect(res.status).to.equal(200);
            done();
          }
        });
    });
  });

  describe('DEL /api/admin', () => {
    it('should return "remove admin"', (done) => {
      supertest(app)
        .del('/api/admin')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('remove admin');
            done();
          }
        });
    });
  });

  describe('GET /api/admin', () => {
    it('should return "get admin"', (done) => {
      supertest(app)
        .get('/api/admin')
        .end((err: any, res: supertest.Response) => {
          if (err) {
            done(err);
          } else {
            expect(res.status).to.equal(200);
            expect(res.body).to.equal('get admin');
            done();
          }
        });
    });
  });
});
