import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import {Deliverable, IDeliverableDocument} from '../models/deliverable.model';
import {Course, ICourseDocument} from '../models/course.model';
import {User, IUserDocument} from '../models/user.model';
import {logger} from '../../utils/logger';
import {DeliverablePayload} from '../interfaces/ui/deliverable.interface';
import {isAdmin} from '../middleware/auth.middleware';
import {TEAM_ADMINS} from '../../test/assets/mockDataObjects';

/**
 * Checks to see if the Deliverable being added or edited has valid fields
 * Validation should remain consistent with front-end checks.
 * 
 * @param IDeliverableDocument or similar object
 * @return boolean true if valid
 */
function isDeliverableValid(deliv: IDeliverableDocument): boolean {
  const HTTPS_REGEX = new RegExp(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
  const NAME_REGEX: RegExp = /^[^_]+([0-9])/;
  const TEAM_SIZE_ERR: string = 'The minimum team size cannot be greater than the maximum team size';
  const CUSTOM_JSON_ERR: string = 'Your custom JSON input should be valid stringified JSON: ';
  const DELIV_NAME_ERR: string = 'A deliverable name must be all lowercase letters, up to 10 characters, and a combination of [a-z] and [0-9].';
  const HTTPS_GIT_REPO_ERR: string = 'Please make sure your Git repo addresses are valid Https URIs.';

  if (deliv.minTeamSize > deliv.maxTeamSize) {
      throw TEAM_SIZE_ERR;
  }

  if (typeof deliv.custom !== 'object') {
    throw CUSTOM_JSON_ERR;
  }

  let name: string = deliv.name;
  if (name.length > 10 || name.search(NAME_REGEX) === -1) {
      throw DELIV_NAME_ERR;
  }

  if (deliv.url.search(HTTPS_REGEX) === -1 || deliv.solutionsUrl.search(HTTPS_REGEX) === -1) {
      throw HTTPS_GIT_REPO_ERR;
  }

  return true;
}

/**
 * Updates a deliverable that matches the deliverable MongoDB _id in deliverable object
 * @param deliverable object new fields with MongoDB _id
 * @return IDeliverableDocument updated deliverable
 */
function updateDeliverable(payload: any): Promise<IDeliverableDocument> {
  logger.info('DeliverablesController::updateDeliverables() in Deliverable Controller');
  console.log(payload);
  let searchParams = {_id: payload.deliverable._id};
  let deliv: IDeliverableDocument = payload.deliverable as IDeliverableDocument;
  return Deliverable.findOne(searchParams)
    .exec()
    .then((d: IDeliverableDocument) => {
      if (d && isDeliverableValid(deliv)) {
        d._id = deliv._id;
        d.open = deliv.open;
        d.close = deliv.close;
        d.teamsInSameLab = deliv.teamsInSameLab;
        d.studentsMakeTeams = deliv.studentsMakeTeams;
        d.solutionsUrl = deliv.solutionsUrl;
        d.solutionsKey = deliv.solutionsKey;
        d.maxTeamSize = deliv.maxTeamSize;
        d.minTeamSize = deliv.minTeamSize;
        d.rate = deliv.rate;
        d.dockerImage = deliv.dockerImage;
        d.dockerBuild = deliv.dockerBuild;
        d.dockerOverride = deliv.dockerOverride;
        d.containerBuilt = deliv.containerBuilt;
        d.buildingRepos = deliv.buildingRepos;
        d.gradesReleased = deliv.gradesReleased;
        d.regressionTest = deliv.regressionTest;
        d.regressionTests = deliv.regressionTests;
        d.whitelistedServers = deliv.whitelistedServers;
        d.projectCount = deliv.projectCount;
        d.url = deliv.url;
        d.deliverableKey = deliv.deliverableKey;
        d.custom = deliv.custom;
        d.customHtml = deliv.customHtml;
        if (isAdmin) {
          // only admins can change name (though not enabled on front-end)
          d.name = deliv.name;
        }
        // name changes to id on the front-end
        return d.save()
          .then((d: IDeliverableDocument) => {
            logger.info(`DeliverableController::updateDeliverable() Successfully saved Deliverable`);
            return d;
          });
      }
      throw `DeliverableController::queryAndUpdateDeliverable() ERROR Could not update ${deliv.name}.`;
    })
    .catch((err) => {
      logger.error(err);
      return Promise.reject(err);
    });
}

/**
 * Gets the default deliverable that is being marked by AutoTest at the time.
 * 
 * ** INFO ** Null is returned if Course does not exist, as we do not want to reveal
 * course information.
 * 
 * The default deliverable is the open deliverable at the time. If more than 1
 * deliverable is open, then latest timestamp creation date is the default deliverable.
 * 
 * @param payload.courseId string ie. '310'
 * @return <string || null> ie. 'd1' or null
 */
function getDefaultDeliv(payload: any): Promise<string> {
  let course: ICourseDocument;
  let delivs: IDeliverableDocument[];
  return Course.findOne({courseId: payload.courseId})
    .then((_course: ICourseDocument) => {
      course = _course;
      return _course;
    })
    .then(() => {
      return Deliverable.find({courseId: course._id})
        .then((_delivs: IDeliverableDocument[]) => {
          if (_delivs) {
            delivs = _delivs;
            return _delivs;
          }
          return null;
        });
    })
    .then(() => {
      let openDelivs: IDeliverableDocument[] = [];
      let currentDate: number = new Date().getTime();

      if (delivs) {
        delivs.map((deliv: IDeliverableDocument) => {
          if (deliv.open < currentDate && deliv.close > currentDate) {
            openDelivs.push(deliv);
          }
        });
      }

      if (openDelivs.length === 0) {
        return null;
      }

      let latestDatedDeliv: IDeliverableDocument;

      openDelivs.map((deliv: IDeliverableDocument) => {
        if (typeof latestDatedDeliv === 'undefined') {
          latestDatedDeliv = deliv;
        } else {
          if (latestDatedDeliv._id > deliv._id) {
            latestDatedDeliv = deliv;
          }
        }
      });
      return latestDatedDeliv.name;
    })
    .catch((err) => {
      logger.error('DeliverableController:: getDefaultDeliv() ERROR ' + err);
      return null;
    });
}

/**
 * Returns the time delay that is set on a Deliverable in seconds
 * @param payload.courseId string course ie. '310'
 * @param payload.deliverableName string deliverable name ie. 'd2'
 * @return <number || null> rate to delay deliverables in seconds or null
 */
function getTestDelay(payload: any): Promise<number> {
  let course: ICourseDocument;
  return Course.findOne({courseId: payload.courseId})
    .then((_course: ICourseDocument) => {
      if (_course) {
        course = _course;
        return _course;
      }
      throw `Cannot find Course ${payload.courseId}`;
    })
    .then((course: ICourseDocument) => {
      return Deliverable.findOne({courseId: course._id, name: payload.deliverableName})
        .then((_deliv: IDeliverableDocument) => {
          if (_deliv) {
            let seconds: number = Math.floor(_deliv.rate / 1000);
            return seconds;
          }
          throw `Cannot find Deliverables for ${payload.courseId}`;
        });
    })
    .catch((err) => {
      logger.error('DeliverableController:: getTestDelay() ERROR ' + err);
      // If cannot find course or deliverables, hide info and return null so as not to guess
      // that Course or Deliverables does or does not exist.
      return null;
    });
}

/**
 * Creates a new Deliverable if it passes validation.
 * 
 * @param payload.deliverable IDeliverableDocument
 * @return IDeliverableDocument returned on successful creation
 */
function addDeliverable(payload: any): Promise<IDeliverableDocument> {
  logger.info('DeliverableController::addDeliverable(..)');
  console.log(payload);
  let courseQuery = {courseId: payload.courseId};
  let newDeliverable: IDeliverableDocument = payload.deliverable as IDeliverableDocument;
  // Delete these properties as a HACK due to a front-end model issue.
  delete newDeliverable._id;
  delete newDeliverable.courseId;
  let isValid: boolean = isDeliverableValid(newDeliverable);
  let createdDeliv: IDeliverableDocument;
  if (isValid) {
    return Course.findOne(courseQuery)
      .then((course: ICourseDocument) => {
        // replace "310" courseId with a refernece to _id object
        newDeliverable.courseId = course._id;
        return Deliverable.findOrCreate(newDeliverable)
          .then((deliv: IDeliverableDocument) => {
            if (deliv) {
              return deliv;
            }
            throw 'Could not create Deliverable';
          });
    });
  } else {
    throw 'Deliverable Valdiation failed.';
  }
}
/**
 * Gets a list of Deliverables based on a Course Id.
 * @param courseId course number, ie. 310
 * @return <DeliverablePayload[] || null> list of deliverables for a course
 */
function getDeliverablesByCourse(payload: any) {
  logger.info('DeliverableController::getDeliverablesByCourse()');

  return Course.findOne({courseId: payload.courseId})
    .then((course: ICourseDocument) => {
      if (course) {
        return course;
      }
      throw new Error(`Course ${payload.courseId} not found`);
    })
    .then((course: ICourseDocument) => {
      return Deliverable.find({courseId: course._id})
        .then((delivs: IDeliverableDocument[]) => {
          if (delivs) {
            logger.info('DeliverableController::getDeliverablesByCourse() - returning ' + delivs.length + ' deliverables');

            // change the database records into the format expected by clients
            let retDelivs: DeliverablePayload[] = [];
            for (let d of delivs) {
              const open = new Date(d.open).getTime();
              const close = new Date(d.close).getTime();
              retDelivs.push({
                id: d.name,
                open: open, 
                close: close, 
                _id: d._id, 
                name: d.name, 
                teamsInSameLab: d.teamsInSameLab,
                studentsMakeTeams: d.studentsMakeTeams,
                maxTeamSize: d.maxTeamSize,
                minTeamSize: d.minTeamSize,
                rate: d.rate,
                dockerImage: d.dockerImage, 
                dockerBuild: d.dockerBuild,
                dockerOverride: d.dockerOverride,
                containerBuilt: d.containerBuilt,
                solutionsUrl: d.solutionsUrl,
                solutionsKey: d.solutionsKey,
                gradesReleased: d.gradesReleased,
                regressionTest: d.regressionTest,
                regressionTests: d.regressionTests,
                whitelistedServers: d.whitelistedServers,
                projectCount: d.projectCount,
                url: d.url,
                deliverableKey: d.deliverableKey,
                buildingRepos: d.buildingRepos,
                customHtml: d.customHtml,
                custom: d.custom
               });
            }
            return retDelivs;
          }
          return null;
        });
    })
    .catch(err => {
      logger.error('DeliverableController::getDeliverablesByCourse ERROR: ' + err.message);
    });
}

export {getDeliverablesByCourse, addDeliverable, updateDeliverable, getTestDelay,
        getDefaultDeliv};
