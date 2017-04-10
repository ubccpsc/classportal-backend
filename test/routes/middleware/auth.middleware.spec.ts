import * as supertest from 'supertest';
import { expect } from 'chai';
import { app } from '../../../server';
import { logger } from '../../../utils/logger';
import { User, IUserDocument } from '../../../app/models/user.model';
let q = require('q');

xdescribe('User API:', function() {
  let user: any;

  // Clear users before testing
  before(function(done) {
    User.remove(function() {
      user = {
        name: 'Andrew Stec',
        email: 'andrewstec@gmail.com',
        password: 'Thepassword1',
      };
      done();

      // user.save(function(err: any) {
      //   if (err) return done(err);
      //   done();
      // });
    });
  });

  // Clear users after testing
  after(function() {
    return User.remove(user).exec();
  });

  xdescribe('GET /api/users/me', function() {
    let token: any;

    before(function(done) {
      supertest(app)
        .post('auth/login/github')
        .send({
          username: 'andrewstec',
          password: 'Thepassword1',
        })
        .end(function(err: any, res: any) {
          console.log(res);
          console.log(err);
          if (!err) {
            console.log(err);
          }
          token = res.body.token;
          done();
        });
    });

    it('should respond with a user profile when authenticated', function(done) {
      supertest(app)
        .get('auth/login/github')
        .set('authorization', 'Bearer ' + token)
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function(err: any, res: any) {
          console.log(res);
          if (!err) {
            console.log(err);
          }
          res.body._id.should.equal(user._id.toString());
          done();
        });
    });

    it('should respond with a 401 when not authenticated', function(done) {
      supertest(app)
        .get('/api/users/me')
        .expect(401)
        .end(done);
    });
  });
});

