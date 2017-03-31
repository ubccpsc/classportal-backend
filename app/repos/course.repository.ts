import { ICourseDocument, Course } from '../models/course.model';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import * as fs from 'fs';

function getAllCourses() {
  return Course.find({}).exec();
}

function getCourseById(courseId: string) {
  return Course.find({ 'courseId': courseId }).exec();
}

function getCourseByTeamSize(minTeamSize: number, maxTeamSize: number) {
  return Course.find({ }).where('minTeamSize').gt(minTeamSize).lt(maxTeamSize).exec();
}

function addCourse(course: ICourseDocument) {
  return Course.create(course)
    .then((c) => {
      c.save(
        function(err) {
          if (err) {
            logger.info('Error saving Course object: ' + err);
            console.log('Cannot save course \n' + err);
          } else {
            logger.info('Successfully saved object Course ' + course.courseId);
            console.log('Successfully saved object Course ' + course.courseId);
          }
        },
      );
      return Object.assign({}, course);
    })
    .catch(Promise.reject);
}

function doesCourseExist(courseId: string) {

  let promise = Course.find({ 'courseId': courseId }).exec();
  promise.then(function(course) {
    if (course) {
      return true;
    } else {
      return false;
    }
  })
  .catch(function(err) {
    console.log('doesCourseExist() error \n' + err);
  });

  return Course.find({ 'courseId': courseId }).exec()
  .then ? true : false ;
}

/**
function getCourseByPlugin(pluginName: string) {

}**/

export { getAllCourses, getCourseById, doesCourseExist, getCourseByTeamSize, addCourse }
