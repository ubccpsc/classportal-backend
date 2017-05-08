import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { Deliverable, IDeliverableDocument } from '../models/deliverable.model';
import { Course, ICourseDocument } from '../models/course.model';
import { User, IUserDocument } from '../models/user.model';
import { logger } from '../../utils/logger';

// Retrives and updates Deliverables object.
function updateDeliverables(course: ICourseDocument, deliverable: any): Promise<IDeliverableDocument> {
  logger.info('updateDeliverables() in Deliverable Controller');
  let deliverableList = new Array;

  if (deliverable !== null && course !== null) {

    let searchParams = { name : deliverable.name, courseId : course._id };

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
            url: deliverable.url,
            open: deliverable.open,
            name: deliverable.name,
            close: deliverable.close,
            gradesreleased: deliverable.gradesReleased,
            courseId: course._id,
          }).then( d => {
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
  logger.info(Error('updateDeliverables(): Insufficient deliverable payload or CourseId' +
  ' does not match'));
  return Promise.reject(Error('Insufficient deliverable payload or CourseId does not match'));
}

// Method only adds Deliverable to course if it is not already added.
function addDeliverablesToCourse(course: any, deliverable: IDeliverableDocument) {
  logger.info('addDeliverablesToCourse() in Deliverable Controller');
  let isntAssigned = (course.deliverables.indexOf(deliverable._id) === -1);
  if (isntAssigned) {
    course.deliverables.push(deliverable._id);
  }
  return course.save();
}

function create(payload: any) {
  logger.info('create() in Deliverable Controller');
  return Course.findOne({ 'courseId' : payload.courseId })
    .exec()
    .then( c => {
      if (c) {
        return updateDeliverables(c, payload);
      } else {
        return Promise.reject(Error('Error assigning deliverables to course #' + payload.courseId + '.'));
      }
    });
}

function read(payload: any) {
  logger.info('read() in Deliverable Controller');
  let searchParams = { courseId : payload.courseId };
  let populateParams = { path: 'deliverables', select: 'id name url open close isReleased' };

  return Course.findOne(searchParams).populate(populateParams)
    .exec()
    .then( c => {
      if (c) {
        return Promise.resolve(c.deliverables);
      } else {
        return Promise.reject(Error('Deliverable does not exist on courseID: #' + payload.courseId));
      }
    })
    .catch((err) => logger.info('Error retrieving deliverable: ' + err));
}

export { create, read }
