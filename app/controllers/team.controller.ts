import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { ITeamDocument, Team } from '../models/team.model';
import { ICourseDocument, Course } from '../models/course.model';
import { IUserDocument, User } from '../models/user.model';
import { IDeliverableDocument, Deliverable } from '../models/deliverable.model';


/**
 * Create a team
 */
function addTeam(req: restify.Request) {
  console.log('params' + JSON.stringify(req.params));

  function checkForDuplicateTeamMembers(teams: ITeamDocument[]) {
    let duplicateEntry: boolean;
    let userCompiliation = new Array();

    for ( let team in teams ) {
      // Push each team member into an array to cross-check Teams per Deliverable with.
      teams[team].members.forEach( function(member) {
        userCompiliation.push(member);
        for (let i = 0; i < userCompiliation.length; i++) {
          duplicateEntry = teams[team].members.some( function(user: IUserDocument) {
            return user._id === userCompiliation[i]._id;
          });
        }
      });

      if (duplicateEntry) {
        console.log('Deuplicate team entry found' + duplicateEntry);
        throw Error('Duplicate team member entry per Deliverable error');
      }
    }
  }
  let courseId = req.params.courseId;
  let deliverable = req.params.deliverable;
  let members = req.params.members;
  let teamQuery = Team.find({ 'deliverable' : deliverable })
    .populate('members').exec();

  // One student per deliverable --> Maps to these conditions:
  // 1) Students must be unique on the team.
  // 2) Amongst the teams that exist with a particular Deliverable ID,
  //    students must also be unique.
  // ---> These conditions ensure that students cannot be on multiple teams
  //      per deliverable.

  // If no teams with deliverableId found, create new team.

  teamQuery
    .then( teams => {
      checkForDuplicateTeamMembers(teams);
    })
    .catch(err => logger.info(err));

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
