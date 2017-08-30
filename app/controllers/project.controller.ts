import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { IProjectDocument, Project } from '../models/Project.model';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';
import * as request from '../helpers/request';


/**
 * Search for a Project by csid and snum, and append it to req.params if successful.
 * @returns {Promise<IProjectDocument>}
 */
function checkRegistration(csid: string, snum: string): Promise<IProjectDocument> {
  if ( !csid && !snum ) {
    return Promise.reject('CSID and SNUM not supplied');
  } else {
    return Project.findOne({ 'csid': csid, 'snum' : snum }).exec() || Promise.reject('Project does not exist');
  }
}



/**
* Determines if Github Projectname is already registered in Project object
* @param {IProjectDocument} mongoose Project instance
* @return {boolean} true if exists
**/
function isProjectnameRegistered(Project: IProjectDocument) {
  // if (Project.Projectname !== '') {
  //   return true;
  // }
  // console.log('Projectname' + Project.Projectname);
  // return false;
}


export { isProjectnameRegistered };