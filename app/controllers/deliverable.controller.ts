import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { Deliverable, IDeliverableDocument } from '../models/deliverable.model';
import { Course, ICourseDocument } from '../models/course.model';
import { User, IUserDocument } from '../models/user.model';
import { logger } from '../../utils/logger';

// Adds DB Course reference to Deliverable object.
function addCourseToDeliverables(course: any, deliverables: [Object]) {
  let deliverableList = new Array;

  if (deliverables) {
    for (let key in deliverables) {
      Deliverable.findOrCreate(deliverables[key])
        .then(d => {
          d.courseId = course._id;
          addDeliverablesToCourse(course, d);
          d.save();
        })
        .catch((err) => logger.info('Error assigning deliverables to ' + course.courseId + ': ' + err));
    }
  }
}

// Only add Deliverable to course if it is not already added.
function addDeliverablesToCourse(course: any, deliverable: any) {
  let isntAssigned = (course.deliverables.indexOf(deliverable._id) === -1);

  if (isntAssigned) {
    course.deliverables.push(course);
    return course.save();
  }
}

function create(payload: any) {

  return Course.findOne({ 'courseId' : payload.courseId })
    .exec()
    .then( c => {
      if (c) {
        return Promise.resolve(addCourseToDeliverables(c, payload.deliverables));
      } else {
        return Promise.reject(Error('Error assigning deliverables to course' + c.courseId));
      }
    })
    .catch((err) => logger.info('Course does not exist: ' + err));
}

export { create }
