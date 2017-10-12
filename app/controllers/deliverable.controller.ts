import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import {Deliverable, IDeliverableDocument} from '../models/deliverable.model';
import {Course, ICourseDocument} from '../models/course.model';
import {User, IUserDocument} from '../models/user.model';
import {logger} from '../../utils/logger';

// Retrieves and updates Deliverable object.
function queryAndUpdateDeliverable(course: ICourseDocument, deliverable: any): Promise<IDeliverableDocument> {
  logger.info('DeliverablesController::updateDeliverables() in Deliverable Controller');
  let deliverableList = new Array;

  if (deliverable !== null && course !== null) {

    let searchParams = {name: deliverable.name, courseId: course._id};

    return Deliverable.findOne(searchParams)
      .then(d => {
        if (d !== null) {
          d.url = deliverable.url;
          d.open = deliverable.open;
          d.close = deliverable.close;
          d.gradesReleased = deliverable.close;
          d.courseId = course._id;
          return d.save();
        } else {
          return Deliverable.create({
            url:            deliverable.url,
            open:           deliverable.open,
            name:           deliverable.name,
            close:          deliverable.close,
            gradesreleased: deliverable.gradesReleased,
            courseId:       course._id,
          }).then(d => {
            course.deliverables.push(d);
            course.save();
            return d;
          })
            .then(() => {
              return addDeliverablesToCourse(course, d);
            });
        }
      });
  }
  logger.info(new Error('updateDeliverables(): Insufficient deliverable payload or CourseId' +
    ' does not match'));
  return Promise.reject(new Error('Insufficient deliverable payload or CourseId does not match'));
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

function updateDeliverable(payload: any) {
  logger.info('DeliverablesController::updateDeliverable() in Deliverable Controller');
  return Course.findOne({'courseId': payload.courseId})
    .exec()
    .then(c => {
      if (c) {
        return queryAndUpdateDeliverable(c, payload);
      } else {
        return Promise.reject(new Error('Error assigning deliverables to course #' + payload.courseId + '.'));
      }
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
            return delivs;
          }
          throw new Error(`No deliverables found for course ${payload.courseId}`);
        });
    })
    .catch(err => {
      logger.error('DeliverableController::getDeliverablesByCourse ERROR: ' + err.message);
    });
}

export {updateDeliverable, getDeliverablesByCourse, addDeliverable};
