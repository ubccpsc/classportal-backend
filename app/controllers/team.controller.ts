import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { ITeamDocument, Team } from '../models/team.model';
import { ICourseDocument, Course } from '../models/course.model';
import { IUserDocument, User } from '../models/user.model';
import { IDeliverableDocument, Deliverable } from '../models/deliverable.model';


/**    userCompiliation.some( function(user: any)) {
      return user === member[i];
    }
 * Create a team
 */
function addTeam(req: restify.Request) {
  let courseId = req.params.courseId;
  let deliverable = req.params.deliverable;
  let members = req.params.members;

  function checkForDuplicateTeamMembers(teams: ITeamDocument[]) {
    let duplicateEntry: boolean;
    let duplicatedMember: boolean;
    let userCompiliation = new Array();

    // Push each team member into an array to cross-check that member is not added
    // to more than one Team per Deliverable.
    for ( let team in teams ) {
      for ( let i = 0; i < teams[team].members.length; i++) {
        userCompiliation.push(teams[team].members[i]);
      }
    }

    for (let i = 0; i < userCompiliation.length; i++) {
      duplicateEntry = members.some( function(member: IUserDocument) {
        return userCompiliation[i] == member;
      });
      if (duplicateEntry) {
        duplicatedMember = true;
      }
    }

    return duplicatedMember;
  }

  let teamQuery = Team.find({ 'deliverable' : deliverable })
    .populate('deliverable')
    .exec()
    .then( teams => {
      console.log('array of teams' + JSON.stringify(teams));
      return checkForDuplicateTeamMembers(teams);
    })
    .catch(err => logger.info(err));

  let courseQuery = teamQuery.then( duplicateMembers => {
      return Course.findOne({ 'courseId' : courseId })
        .exec();
  })
  .catch(err => logger.info(err));

  let createTeam = function(courseId: string) {
    return Team.create({
      'course' : courseId,
      'deliverable' : deliverable,
      'members' : members,
    })
    .catch(err => logger.info('Error creating course' + err));
  };

  return Promise.all([teamQuery, courseQuery])
    .then(function(results: any) {
      console.log(results);
      if (results[0] !== true) {
        return createTeam(results[1]._id)
          .then( t => {
            return t;
          })
          .catch(err => 'Cannot create team' + err);
      }
      throw Error('Cannot add duplicate team members to deliverable.');
    });

  // One student per deliverable --> Maps to these conditions:
  // 1) Students must be unique on the team.
  // 2) Amongst the teams that exist with a particular Deliverable ID,
  //    students must also be unique.
  // ---> These conditions ensure that students cannot be on multiple teams
  //      per deliverable.

  // If no teams with deliverableId found, create new team.
}

export { addTeam }
