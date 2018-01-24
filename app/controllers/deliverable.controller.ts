import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import {Deliverable, IDeliverableDocument} from '../models/deliverable.model';
import {Course, ICourseDocument} from '../models/course.model';
import {User, IUserDocument} from '../models/user.model';
import {logger} from '../../utils/logger';
import {DeliverablePayload} from '../interfaces/ui/deliverable.interface';


/**
 * Updates a deliverable that matches the deliverable MongoDB _id in deliverable object
 * @param deliverable object new fields with MongoDB _id
 * @return IDeliverableDocument[] list of deliverables for a course
 */
function updateDeliverable(payload: any): Promise<IDeliverableDocument> {
  logger.info('DeliverablesController::updateDeliverables() in Deliverable Controller');
    console.log(payload);
    let searchParams = {_id: payload.deliverable._id};

    return Deliverable.findOne(searchParams)
      .exec()
      .then((d: IDeliverableDocument) => {
        if (d) {
          d.url = payload.deliverable.url;
          d.open = payload.deliverable.open;
          d.close = payload.deliverable.close;
          d.gradesReleased = payload.deliverable.gradesReleased;
          d.markInBatch = payload.deliverable.markInBatch;
          d.buildingRepos = payload.deliverable.buildingRepos;
          // name changes to id on the front-end
          d.name = payload.deliverable.id;
          return d.save()
            .then((d: IDeliverableDocument) => {
              logger.info('DeliverableController::updateDeliverable() Successfully saved Deliverable');
              return d;
            });
        } 
        throw 'DeliverableController::queryAndUpdateDeliverable() ERROR Could not find a deliverable to update';
      })
      .catch((err) => {
        logger.error(err);
        return Promise.reject(err);
      });
}

// Method only adds Deliverable to course if it is not already added.
function addDeliverablesToCourse(course: any, deliverable: IDeliverableDocument) {
  logger.info('DeliverablesController::addDeliverablesToCourse(..)');
  let isntAssigned = (course.deliverables.indexOf(deliverable._id) === -1);
  if (isntAssigned) {
    course.deliverables.push(deliverable._id);
  }
  return course.save();
}

function getDefaultDeliv(payload: any): Promise<string> {
  let course: ICourseDocument;
  let delivs: IDeliverableDocument[];
  return Course.findOne({courseId: payload.courseId})
    .then((_course: ICourseDocument) => {
      if (_course) {
        course = _course;
        return _course;
      }
      throw `Cannot find course ${payload.courseId}`;
    })
    .then(() => {
      return Deliverable.find({courseId: course._id})
        .then((_delivs: IDeliverableDocument[]) => {
          if (_delivs) {
            delivs = _delivs;
            return _delivs;
          }
          throw `Cannot find any deliverables under ${payload.courseId}`;
        });
    })
    .then(() => {
      let openDelivs: IDeliverableDocument[] = [];
      let currentDate: number = new Date().getTime();
      // the "default deliverable" is the open deliverable at the time. If >1 delivs are
      // open, then earliest close date is default deliverable
      delivs.map((deliv: IDeliverableDocument) => {
        if (deliv.open < currentDate && deliv.close > currentDate) {
          openDelivs.push(deliv);
        }
      });
      console.log(openDelivs.length);
      if (openDelivs.length === 0) {
        throw `Cannot find any open deliverables to default to.`;
      }

      let earliestDatedDeliv: IDeliverableDocument;

      openDelivs.map((deliv: IDeliverableDocument) => {
        if (typeof earliestDatedDeliv === 'undefined') {
          earliestDatedDeliv = deliv;
        } else {
          if (earliestDatedDeliv.close > deliv.close) {
            earliestDatedDeliv = deliv;
          }
        }
      });
      return earliestDatedDeliv.name;
    });
}

/**
 * Returns the time delay that is set on a Deliverable in seconds
 * @param payload.courseId string course ie. '310'
 * @param payload.deliverableName string deliverable name ie. 'd2'
 * @return number (rate to delay deliverables in seconds)
 */
function getTestDelay(payload: any): Promise<number> {
  let course: ICourseDocument;
  return Course.findOne({courseId: payload.courseId})
    .then((_course: ICourseDocument) => {
      if (_course) {
        course = _course;
        return _course;
      }
      throw `Could not find course ${payload.courseId}`;
    })
    .then((course: ICourseDocument) => {
      return Deliverable.findOne({courseId: course._id, name: payload.deliverableName})
        .then((deliv: IDeliverableDocument) => {
          if (deliv) {
            let seconds: number = Math.floor(deliv.rate / 1000);
            return seconds;
          }
          throw `Cannot find Deliverable under ${payload.deliverableName} and ${payload.courseId}`;
        });
    });
}

// Adds a deliverable. Rejects if Deliverable exists with same Course Name and Course._id
// Adds Deliverable reference to Course object
function addDeliverable(payload: any): Promise<IDeliverableDocument> {
  logger.info('DeliverableController::addDeliverable(..)');
  console.log(payload.params);
  let newDeliverable = payload.params.deliverable;
  let courseQuery = {courseId: newDeliverable.courseId};
  let queriedCourse: ICourseDocument;
  return Course.findOne(courseQuery)
    .then((course: ICourseDocument) => {
      // replace "310" courseId with a refernece to _id object
      newDeliverable.courseId = course._id;
      queriedCourse = course;
      return findDelivWithCourse(newDeliverable.name, course._id);
    })
    .then(() => {
      return Deliverable.findOrCreate(newDeliverable)
        .then((newDeliv: IDeliverableDocument) => {
          return newDeliv;
        })
        .then((createdDeliv: IDeliverableDocument) => {
          queriedCourse.deliverables.push(createdDeliv._id);
          return queriedCourse.save()
            .then(() => {
              return createdDeliv;
            });
        });
    })
    .catch(err => {
      logger.error(`DeliverableController::addDeliverable ERROR ${err}`);
    });

  function findDelivWithCourse(name: string, course_id: string) {
    let delivQuery = {name: newDeliverable.name, courseId: course_id};
    return Deliverable.findOne(delivQuery)
      .then((deliv: IDeliverableDocument) => {
        if (deliv) {
          throw new Error(`Deliverable with same Name and CourseId already exist.`);
        }
        return deliv;
      })
      .catch(err => {
        logger.error(`DeliverableController::findDelivWithCourse() ERROR ${err}`);
      });
  }
}

/**
 *
 * @param courseId course number, ie. 310
 * @return IDeliverableDocument[] list of deliverables for a course
 */
function getDeliverablesByCourse(payload: any) {
  console.log(payload);
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
            logger.info('DeliverableController::getDeliverablesByCourse() - returning length: ' + delivs.length);

            // change the database records into the format expected by clients
            let retDelivs: DeliverablePayload[] = [];
            for (let d of delivs) {
              // temporary unix timestamp to fix deliverable until 
              // can be properly schemaed on back-end API.
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
                gradesReleased: d.gradesReleased,
                projectCount: d.projectCount,
                markInBatch: d.markInBatch,
                url: d.url,
                buildingRepos: d.buildingRepos
               });
            }
            return retDelivs;
          }
          throw new Error(`No deliverables found for course ${payload.courseId}`);
        });
    })
    .catch(err => {
      logger.error('DeliverableController::getDeliverablesByCourse ERROR: ' + err.message);
    });
}

export {getDeliverablesByCourse, addDeliverable, updateDeliverable, getTestDelay,
        getDefaultDeliv};
