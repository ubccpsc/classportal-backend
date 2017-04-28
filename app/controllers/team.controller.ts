import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { ITeamDocument, Team } from '../models/team.model';
import { ICourseDocument, Course } from '../models/course.model';
import { IUserDocument, User } from '../models/user.model';
import { IDeliverableDocument, Deliverable } from '../models/deliverable.model';
import * as auth from '../middleware/auth.middleware';

let req: any;

function checkForDuplicateTeamMembers(existingTeams: ITeamDocument[], newTeamMembers: [Object]) {
  let duplicateEntry: boolean;
  let duplicatedMember: boolean;
  let userCompiliation = new Array();

  console.log('existing teams' + existingTeams);

  if (req.isAuthenticated() && auth.isAdmin) {
    
  }
  // If we are an admin updating a team, we take the existing team out of the duplicationCheck to exclude
  // members in the team that we are updating, or else we would always return true for duplication.



  // Push each team member into an array to cross-check that member is not added
  // to more than one Team per Deliverable.
  for ( let team in existingTeams ) {
    for ( let i = 0; i < existingTeams[team].members.length; i++) {
      userCompiliation.push(existingTeams[team].members[i]);
    }
  }

  for (let i = 0; i < userCompiliation.length; i++) {
    duplicateEntry = newTeamMembers.some( function(member: IUserDocument) {
      return userCompiliation[i] == member;
    });
    if (duplicateEntry) {
      duplicatedMember = true;
    }
  }

  return duplicatedMember;
}

let createTeam = function(course_Id: string) {

  let deliverable = req.params.deliverable;
  let newTeamMembers = req.params.members;
  let name = req.params.name;
  let githubUrl = req.params.githubUrl;
  let teamId = req.params.teamId;
  let admins = req.params.admins;

  let teamWithAdmins = {
    'course' : course_Id,
    'deliverable' : deliverable,
    'members' : newTeamMembers,
    'name' : name,
    'teamId' : teamId,
    'githubUrl' : githubUrl,
    'admins' : admins,
  };
  let teamWithoutAdmins = {
    'course' : course_Id,
    'deliverable' : deliverable,
    'members' : newTeamMembers,
    'name' : name,
    'teamId' : teamId,
    'githubUrl' : githubUrl,
  };

  // Only Admin Authenticated users can use this endpoint to add admins to a team.
  if (req.isAuthenticated() && auth.isAdmin) {
    return Team.create(teamWithAdmins).catch(err => logger.info('Error creating course: ' + err));
  } else {
    return Team.create(teamWithoutAdmins).catch(err => logger.info('Error creating course: ' + err));
  }
};


function updateTeam(_req: any) {
  req = _req;
  let courseId = req.params.courseId;
  let deliverable = req.params.deliverable;
  let members = req.params.members;
  let name = req.params.name;
  let githubUrl = req.params.githubUrl;
  let teamId = req.params.teamId;
  let admins = req.params.admins;


}


// One student per deliverable --> Maps to these conditions:
// 1) Students must be unique on the team.
// 2) Amongst the teams that exist with a particular Deliverable ID,
//    students must also be unique.
// ---> These conditions ensure that students cannot be on multiple teams
//      per deliverable.
// 3) If no teams with deliverableId found, create new team.

function addTeam(_req: any) {
  req = _req;
  let courseId = req.params.courseId;
  let deliverable = req.params.deliverable;
  let newTeamMembers = req.params.members;
  let name = req.params.name;
  let githubUrl = req.params.githubUrl;
  let teamId = req.params.teamId;
  let admins = req.params.admins;

  let teamQuery = Team.find({ 'deliverable' : deliverable })
    .populate('deliverable')
    .exec()
    .then( existingTeams => {
      console.log('array of teams' + JSON.stringify(existingTeams));
      return checkForDuplicateTeamMembers(existingTeams, newTeamMembers);
    })
    .catch(err => logger.info(err));

  let courseQuery = teamQuery.then( duplicateMembers => {
      return Course.findOne({ 'courseId' : courseId })
        .exec();
  })
  .catch(err => logger.info(err));

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
}

export { addTeam }
