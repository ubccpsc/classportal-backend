import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import {Deliverable, IDeliverableDocument, DeliverablePayload} from '../models/deliverable.model';
import {Course, ICourseDocument} from '../models/course.model';
import {User, IUserDocument} from '../models/user.model';
import {logger} from '../../utils/logger';
import {isAdmin} from '../middleware/auth.middleware';
import {TEAM_ADMINS} from '../../test/assets/mockDataObjects';
import {MongoClient} from 'mongodb';
import db from '../db/MongoDBClient';

const ObjectId = require('mongodb').ObjectID;

export interface ContainerInfo {
  dockerImage: string;
  dockerBuild: string;
  testDelay: number;
  regressionTest: boolean;
  regressionDelivNames: string[];
}

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
  // const HTTPS_GIT_REPO_ERR: string = 'Please make sure your Git repo addresses are valid Https URIs.';
  const OPEN_CLOSE_ERR: string = 'The close date must be greater than the open date.';

  if (deliv.minTeamSize > deliv.maxTeamSize) {
      throw TEAM_SIZE_ERR;
  }

  if (deliv.open > deliv.close) {
    throw OPEN_CLOSE_ERR;
  }

  if (typeof deliv.custom !== 'object') {
    throw CUSTOM_JSON_ERR;
  }

  let name: string = deliv.name;
  if (name.length > 10 || name.search(NAME_REGEX) === -1) {
      throw DELIV_NAME_ERR;
  }

  // Disabled. Too determined. 
  // if (deliv.url.search(HTTPS_REGEX) === -1 || deliv.solutionsUrl.search(HTTPS_REGEX) === -1) {
  //     throw HTTPS_GIT_REPO_ERR;
  // }

  return true;
}

/**
 * Gets the container info for a Deliverable. Includes regression tests, test delay, and 
 * dockerImage tag names.
 * 
 * Retrieves container Deliverable tag name if Docker override is enabled. Otherwise 
 * retrieves the Course tag name.
 * @param payload.courseId string name of course ie. '310'
 * @param payload.deliverableName string name ie. 'd1'
 * @return ContainerInfo name on Deliv default Course tag name.
 */
function getContainerInfo(payload: any): Promise<ContainerInfo> {
  logger.info('DeliverablesController::getContainerInfo() in Deliverable Controller');
  console.log(payload);
  return Course.findOne({courseId: payload.courseId})
    .then((course: ICourseDocument) => {
      if (course) {
        return Deliverable.findOne({courseId: course._id, name: payload.deliverableName})
        .then((deliv: IDeliverableDocument) => {
          if (deliv) {
            let containerInfo: ContainerInfo = {
              dockerImage: deliv.dockerImage,
              dockerBuild: deliv.dockerBuild,
              testDelay: Math.floor(deliv.rate / 1000),
              regressionTest: deliv.regressionTest,
              regressionDelivNames: deliv.regressionTests.match(/[^ ]+/g) || []
            };
            return containerInfo;
          }
          throw `Cannot find Deliverable under ${payload.courseId} and ${payload.deliverableName}`;
        });
      }
      throw `Cannot find Course under ${payload.courseId}`;
    });
}

/**
 * Updates a deliverable that matches the deliverable MongoDB _id in deliverable object
 * 
 * ** NOTE ** If adding a Regression Test, adds Deliverable Id to any Teams that exist for Id 
 * so that the front-end can join the regression test with the Team informationa to group grades
 * based on the team. 
 * 
 * @param deliverable object new fields with MongoDB _id
 * @return IDeliverableDocument updated deliverable
 */
function updateDeliverable(payload: any): Promise<IDeliverableDocument> {
  logger.info('DeliverablesController::updateDeliverables() in Deliverable Controller');
  const TEAMS_COLLECTION = 'teams';
  console.log('updateDeliverable() payload received', payload);
  let searchParams = {_id: payload.deliverable._id};
  let deliv: IDeliverableDocument = payload.deliverable as IDeliverableDocument;
  return Deliverable.findOne(searchParams)
    .exec()
    .then((d: IDeliverableDocument) => {
      // #1: Update deliverable properties
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
        d.dockerRepo = deliv.dockerRepo;
        d.dockerKey = deliv.dockerKey;
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
        return d;
      }
      throw `DeliverableController::queryAndUpdateDeliverable() ERROR Could not update ${deliv.name}.`;
    })
    .then((d: IDeliverableDocument) => {
      // #2: IF admin, update Deliverable name.
      if (isAdmin) {
        // only admins can change name (though not enabled on front-end)
        d.name = String(deliv.name).toLowerCase();
      }
      return d;
    })
    .then((d: IDeliverableDocument) => {
      // #3: Ensure regress test Deliverable Ids in Teams.deliverableIds
      // so that the front-end can group teams together for grades.

      const WHITESPACE_DELIN = /\S+/g;
      let regressionTests: string[] = [];
      let regressDelivIds: any[] = [];

      if (deliv.regressionTests !== 'undefined' && deliv.regressionTests.length > 0) {
        regressionTests = deliv.regressionTests.match(WHITESPACE_DELIN);
      }

      if (isAdmin) {
        addRegressionIdsToDeliv(d, payload.courseId);
        return d;
      } else {
        return d;
      }
    })
    .then((d: IDeliverableDocument) => {
      // name changes to id on the front-end
      return d.save()
      .then((d: IDeliverableDocument) => {
        logger.info(`DeliverableController::updateDeliverable() Successfully saved Deliverable`);
        return d;
      });
    })
    .catch((err: any) => {
      logger.error('DeliverableController::updateDeliverable() ERROR ' + err);
      return Promise.reject(err);
    });
}


  /**
   * Ensures that regression test Deliverable Ids in Teams.deliverableIds so that the front-end can group teams together for grades.
   * 
   * Regression Tests are part of 310's business logic, which requires grades are grouped by a Team. Must be able to join
   * a Deliverable name with regression tests where no repositories exist for regression tests. Regression tests are
   * based off of a Deliverable. A Deliverable must exist for a regression test to work.
   * 
   * @param deliv IDeliverableDocument of the Deliverable that hold the space-dilinated regressionTests to update/created
   * @param courseId The Course where regressionTest names should be fetched from.
   * @return boolean true if the regression Ids were successfully added to the relevant Team objects
   */
function addRegressionIdsToDeliv(deliv: IDeliverableDocument, courseId: string): Promise<boolean> {
  const TEAMS_COLLECTION = 'teams';
  const WHITESPACE_DELIN = /\S+/g;
  let regressionTests: string[] = [];
  let regressDelivIds: any[] = [];

  if (deliv.regressionTests !== 'undefined' && deliv.regressionTests.length > 0) {
    regressionTests = deliv.regressionTests.match(WHITESPACE_DELIN);
  }

  if (isAdmin) {

    return Course.findOne({courseId: courseId})
      .then((course: ICourseDocument) => {
        if (course) {
          return course;
        }
        throw `Could not find Course ${courseId}`;
      })
      .then((course: ICourseDocument) => {
        // remove itself, as it already exists in Team.deliverableIds and you do not want 
        // it to run in AutoTest twice.
        let index = regressionTests.indexOf(deliv.name);
        if (index > -1) {
          regressionTests.splice(index, 1);
        }

        return Deliverable.find({courseId: course._id, name: {$in: regressionTests}})
          .then((delivs: IDeliverableDocument[]) => {
            if (delivs) {

              // IMPORTANT: The first array element is the original team deliverable. 
              // All further properties are regression test Deliverable Id elements.
              regressDelivIds.push(new ObjectId(deliv._id));

              delivs.map((_deliv) => {
                regressionTests.map((regressionTest) => {
                  // want to add the regression Test deliverable Ids but avoid an infinite loop in AutoTest
                  // if someone accidentally adds the original deliv to the regression tests list
                  if (regressionTest === _deliv.name && regressionTest !== deliv.name) {
                    console.log('deliv id', _deliv._id);
                    regressDelivIds.push(_deliv._id);
                  }
                });
              });

              console.log('1', {'deliverableIds.0': new ObjectId(deliv._id)});
              console.log('2', {$set: {'deliverableIds': regressDelivIds}});
              db.updateMany(TEAMS_COLLECTION, {'deliverableIds.0': new ObjectId(deliv._id)}, {$set: {'deliverableIds': regressDelivIds}})
                .then((updateResponse) => {
                  console.log('DeliverableController:: update regression test Ids: ', updateResponse);
                  return true;
                })
                .catch((err) => {
                  console.log('DeliverableController:: update regression test Ids ERRPR: ' + err);
                  return deliv;
                });
            }
            return true;
          });
      });
  } else {
    return Promise.resolve(false);
  }

}

/**
 * Gets the default deliverable that is being marked by AutoTest at the time.
 * 
 * ** INFO ** Null is returned if Course does not exist, as we do not want to reveal
 * course information.
 * 
 * The default deliverable is the open deliverable at the time. If more than 1
 * deliverable is open, then the latest timestamp creation date is the default deliverable.
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

      let sortedOpenDelivs = openDelivs.sort((a: IDeliverableDocument, b: IDeliverableDocument) => {
        return a._id - b._id;
      });

      return sortedOpenDelivs[sortedOpenDelivs.length - 1].name;
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
 * Creates a new Deliverable if it passes validation. Ensures that Deliverable
 * 'name' is all lowercase server-side.
 * 
 * Adds Course + DelivName information to the new Deliverable 'dockerImage' property
 * used to drop and add Containers. Front-end should not touch this property.
 * 
 * @param payload.deliverable IDeliverableDocument
 * @return IDeliverableDocument returned on successful creation
 */
function addDeliverable(payload: any): Promise<IDeliverableDocument> {
  logger.info('DeliverableController::addDeliverable(..)');
  console.log(payload);
  let newDeliverable: IDeliverableDocument = payload.deliverable as IDeliverableDocument;
  // Delete these properties as a HACK due to a front-end model issue.
  delete newDeliverable._id;
  delete newDeliverable.courseId;
  newDeliverable.name = String(newDeliverable.name).toLowerCase();

  let isValid: boolean = isDeliverableValid(newDeliverable);
  let createdDeliv: IDeliverableDocument;

  if (isValid) {
    return Deliverable.findOne(newDeliverable)
    .then((deliv: IDeliverableDocument) => {
      if (deliv) {
        throw 'Deliverable already exists';
      }
      return deliv;
    })
    .then((deliv: IDeliverableDocument) => {
        return Course.findOne({courseId: payload.courseId})
          .then((course: ICourseDocument) => {
            if (course) {

              // Adding in Docker Image Course and Deliv info:
              newDeliverable.dockerImage = 'autotest/cpsc' + course.courseId + '__' + newDeliverable.name + '__bootstrap';

              // Adding in MongoDB object Id
              newDeliverable.courseId = course._id;
              return newDeliverable;
            }
            throw `Could not find Course`;
          });
    })
    .then(() => {
      return Deliverable.create(newDeliverable)
        .then((deliv: IDeliverableDocument) => {
          addRegressionIdsToDeliv(deliv, payload.courseId);
          return deliv;
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
                dockerRepo: d.dockerRepo,
                dockerKey: d.dockerKey,
                buildingContainer: d.buildingContainer,
                dockerLogs: d.dockerLogs,
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
        getDefaultDeliv, getContainerInfo};
