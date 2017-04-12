import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { Deliverable, IDeliverableDocument } from '../models/deliverable.model';
import { Course, ICourseDocument } from '../models/course.model';
import { User, IUserDocument } from '../models/user.model';
import { logger } from '../../utils/logger';

// Retrives and updates Deliverables object.
function updateDeliverables(course: any, deliverables: any) {
  logger.info('updateDeliverables() in Deliverable Controller');
  let deliverableList = new Array;

  if (deliverables && course) {

    for (let key in deliverables) {

      let searchParams = { name : deliverables[key].name, courseId : course._id };

      Deliverable.findOrCreate(searchParams)
        .then(d => {
          console.log('test' + JSON.stringify(d));
          d.url = deliverables[key].url;
          d.open = deliverables[key].open;
          d.close = deliverables[key].close;
          d.gradesReleased = deliverables[key].close;
          d.courseId = course._id;
          d.save();
          addDeliverablesToCourse(course, d);
        })
        .catch((err) => logger.info('Error assigning deliverables to ' + course.courseId + ': ' + err));
    }
  }
}

// Only add Deliverable to course if it is not already added.
function addDeliverablesToCourse(course: any, deliverable: any) {
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
        return Promise.resolve(updateDeliverables(c, payload.deliverables));
      } else {
        return Promise.reject(Error('Error assigning deliverables to course' + c.courseId));
      }
    })
    .catch((err) => logger.info('Course does not exist: ' + err));
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
