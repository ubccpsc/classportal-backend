import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { Deliverable, IDeliverableDocument } from '../models/deliverable.model';
import { Course, ICourseDocument } from '../models/course.model';
import { User, IUserDocument } from '../models/user.model';
import { logger } from '../../utils/logger';

function assignDeliverablesToCourse(course: any, deliverables: [Object]) {
  let deliverableList = new Array;

  if (deliverables) {
    for (let key in deliverables) {
      Deliverable.findOrCreate(deliverables[key])
        .then(d => {
          d.courseId = course._id;
          d.save();
        })
        .catch((err) => logger.info('Error assigning deliverables to ' + course.courseId + ': ' + err));
    }
  }
  return course;
}

function create(payload: any) {

  console.log(payload);
  return Course.findOne({ 'courseId' : payload.courseId })
    .exec()
    .then( c => {
      if (c) {
        console.log(c);
        return Promise.resolve(assignDeliverablesToCourse(c, payload.deliverables));
      } else {
        return Promise.reject(Error('Error assigning deliverables to course' + c.courseId));
      }
    })
    .catch((err) => logger.info('Course does not exist: ' + err));
}

export { create }
