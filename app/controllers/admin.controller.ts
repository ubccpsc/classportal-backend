import * as restify from 'restify';
import { logger } from '../../utils/logger';

/**
 * Get an admin
 */
function get(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, 'get admin');
  return next();
}

/**
 * Create an admin
 */
function create(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, 'create admin');
  return next();
}

/**
 * Update an admin
 */
function update(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, 'update admin');
  return next();
}

/**
 * Delete an admin
 */
function remove(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, 'remove admin');
  return next();
}

export { get, create, update, remove }
