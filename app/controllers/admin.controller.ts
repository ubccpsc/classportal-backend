import * as restify from 'restify';
import * as mongoose from 'mongoose';
import { Admin, IAdminDocument } from '../models/admin.model';
import { logger } from '../../utils/logger';

/**
 * Create a new admin from a username, and return it.
 * @property {string} req.params.username
 * @property {string} req.params.lastname
 * @property {string} req.params.firstname
 * @returns {IAdminDocument}
 */
function create(req: restify.Request, res: restify.Response, next: restify.Next) {
  Admin.create(req.params.username, req.params.lastname, req.params.firstname)
    .then((savedAdmin: IAdminDocument) => {
      res.json(200, savedAdmin);
      return next();
    })
    .catch((err: any) => next(err));
}

/**
 * Get an admin
 */
function get(req: restify.Request, res: restify.Response, next: restify.Next) {
  res.json(200, 'get admin');
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
