import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { ITeamDocument, Team } from '../models/team.model';
import { ICourseDocument, Course } from '../models/course.model';
import { IDeliverableDocument, Deliverable } from '../models/deliverable.model';


/**
 * Create a team
 */
function addTeam(req: restify.Request) {
  console.log('params' + JSON.stringify(req.params));

  let courseId = req.params.courseId;
  let deliverable = req.params.deliverable;
  let members = req.params.members;
  let deliverableQuery = Deliverable.findById(deliverable).exec();

  // One student per deliverable --> Maps to these conditions:
  // 1) Students must be unique on the team.
  // 2) Amongst the teams that exist with a particular Deliverable ID, 
  //    students must also be unique.
  // ---> These conditions ensure that students cannot be on multiple teams
  //      per deliverable.


  deliverableQuery
    .then( d => {

      if (d === null) {
        throw Error('No deliverable document found');
      } else {

      }
      // I am looking for the Teams with a Deliverable to see if Users exist on the teams. 
      // Must check for this criteria, as one student per deliverable is the plan.
    })

  return Course.findOne({ 'courseId' : courseId })
    .exec()
    .then( c => {
      return Team.create({
        'course' : c._id,
        'deliverable' : deliverable,
        'members' : members,
      })
      .catch( err => {
        logger.info('There was an error creating the team: ' + err);
      });
    })
    .catch( err => {
      logger.info('There was an error finding the course: ' + err);
    });
}

export { addTeam }
