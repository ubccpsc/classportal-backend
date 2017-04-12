import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { Grade, IGradeDocument } from '../models/grade.model';
import { Course, ICourseDocument } from '../models/course.model';

function create(payload: any) {
  logger.info('create() in Grades Controller');

  const COURSE_ID = payload.courseId;
  // const BULK_WRITE_OPTIONS = {
  //   updateOne: {
  //     filter: { courseId : COURSE_ID },
  //   }
  // }
  // return Grade.collection.bulkWrite(grades,)

  let grades = payload.grades;
  let courseQuery = Course.findOne({ courseId: COURSE_ID })
  .then(course => {
  	if (course) {
  		return Promise.resolve(course);
  	}
  	return Promise.reject(Error('Course does not exist'));
  })

  for ( let i = 0; i < grades.length ; i++ ) {
    grades[i].courseId = COURSE_ID;
    Grade.findOrCreate(grades[i]).then(g => {
      courseQuery.then(c=> {
      	c.grades.push(g);
      })
    });
  }

  
  // add grades references to course object
  return query.then(course => {
    if (course) {
      grades.forEach((grade: any) => {
        course.grades.push(grade);
      });
    }
    return course.save();
  });
}

function read(payload: any) {
  logger.info('get grades');
  console.log(payload.grades);
  return Promise.resolve('hello');
}

function update(req: restify.Request, res: restify.Response, next: restify.Next) {
  logger.info('update grades');
  res.json(200, 'update grades');
  return next();
}

export { update, read, create }
