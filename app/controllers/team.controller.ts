import * as restify from 'restify';
import { logger } from '../../utils/logger';

/**
 * Get a team
 */
function get(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, 'get team');
  return next();
}

/**
 * Create a team
 */
function create(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, 'create team');
  return next();
}

/**
 * Create a team
 */
function update(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, 'update team');
  return next();
}

/**
 * Create a team
 */
function remove(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, 'remove team');
  return next();
}

export { get, create, update, remove }
