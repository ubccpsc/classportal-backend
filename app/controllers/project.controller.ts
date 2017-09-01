import * as fs from 'fs';
import * as restify from 'restify';
import * as parse from 'csv-parse';
import { IProjectDocument, Project } from '../models/project.model';
import { IDeliverableDocument, Deliverable } from '../models/deliverable.model';
import { ICourseDocument, Course } from '../models/course.model';
import { IUserDocument, User } from '../models/user.model';
import { logger } from '../../utils/logger';
import { config } from '../../config/env';
import * as request from '../helpers/request';

const PROJECT_PREPEND = 'project';

/**
* Determines if Github Projectname is already registered in Project object
* @param courseId
* @param labId
* @param deliverableName
* @return {boolean} true if exists
**/
function generateProjects(payload: any) {
  // Payload contains: courseId: string, deliverableName: string
  let course: ICourseDocument;
  let deliverable: IDeliverableDocument;

  return Course.findOne({ courseId: payload.courseId })
    .populate({ path: 'classList' })
    .then((_course: ICourseDocument) => {
      if (!_course) {
        throw `Course ${payload.courseId} not found`;
      }
      // Turn off once Single Projects are allowed on markByBatch Team Courses as well
      if (_course.settings.markDelivsByBatch) {
        throw `Cannot generate projects for MarkByBatch Team groups`;
      }
      course = _course;
      console.log('the course', course);
      return _course;
    })
    .then((_course: ICourseDocument) => {
      return Deliverable.findOne({ courseId: _course._id, name: payload.deliverableName })
        .then((_deliv: IDeliverableDocument) => {
          if (!_deliv) {
            throw `Deliverable ${payload.delieverableName} not found with Course ${payload.courseId}`;
          }
          deliverable = _deliv;
          return _deliv;
        }).catch(err => {
          logger.error(`ProjectController::generateProjects ERROR: ${err}`);
        });
    })
    .then((deliv: IDeliverableDocument) => {
      let classList: any = course.classList;
      let bulkInsertProjectArray = new Array();
        
      for (let i = 0; i < course.classList.length; i++) {
        let student: any = course.classList[i];

        let newProject: object = {
          student: student._id,
          deliverableId: deliv._id,
          courseId: course._id,
          name: '',
          githubUrl: '',
          githubRepoId: '',
        };

        bulkInsertProjectArray.push(newProject);
      }

      // cleans out all entries that already exist in Projects table 
      // to avoid duplicate entries
      return filterAlreadyCreatedProjects(bulkInsertProjectArray)
        .then((cleanBulkEntryList: any) => {
          return Project.collection.insertMany(cleanBulkEntryList);
        });
    })
    .catch(err => {
      logger.error(`ProjectController::generateProjects() ERROR ${err}`);
    });
    
    function filterAlreadyCreatedProjects(bulkInsertList: any) {

      return Project.find({ deliverableId: deliverable._id, courseId: course._id })
        .then((projects: IProjectDocument[]) => {
          // If there are projects in the DB, compare them against the bulk insert list
          // and remove the insertions that match in the DB already.

          // Also, label them with latest projectCount num that is under the Deliverable
          if (projects.length > 0) {

            // filter function
            let filteredList = bulkInsertList.filter((bulkInsertListItem: IProjectDocument) => {
            let existInDB: Boolean = false;
              for (let i = 0; i < projects.length; i++) {
                let studentInProject = projects[i].student.toString();
                let bulkInsertListItemStudent = bulkInsertListItem.student.toString();
                if (studentInProject.indexOf(bulkInsertListItemStudent) > -1) {
                  existInDB = true;
                }
              }
              return !existInDB;
            });

            // label function
            let counter = 1;
            for (let i = 0; i < filteredList.length; i++) {
              filteredList[i].name = PROJECT_PREPEND + ( deliverable.projectCount + counter++);
            }
            
            // then submit filtered list to database after saving new project count
            deliverable.projectCount = deliverable.projectCount + counter;
            return deliverable.save()
              .then(() => {
                return filteredList;
              });
          }
          else {

            // label 
            // else means that no other projects exist in repo and we should start 
            // counting and labeling from 1

            let counter = 1;
            for (let i = 0; i < bulkInsertList.length; i++) {
              bulkInsertList[i].name = PROJECT_PREPEND + (counter++);
            }
            deliverable.projectCount = counter;
            deliverable.save();
            return bulkInsertList;
          }
        });
    }
}


export { generateProjects };