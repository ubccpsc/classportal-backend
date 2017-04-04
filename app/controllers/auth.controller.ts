import { passport } from '../../config/restify';
import { User } from '../models/user.model';
import * as restify from 'restify';

/**
 * Test Github authentication
 * @return User
 */

function login(params: Object) {
  passport.authenticate('github');
  console.log('inside auth.login controller function ');
  console.log(params);
  return User.find({ 'courseId': 123 });
}

function callback(params: Object) {
  passport.authenticate('github', { failureRedirect: '/login' });
  return User.find({ 'courseId': 123 });
}

export { login, callback };