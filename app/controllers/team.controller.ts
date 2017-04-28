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
  console.log('duplicated member');
  return duplicatedMember;
}

let createTeam = function(course_Id: string) {

  let deliverable = req.params.deliverable;
  let newTeamMembers = req.params.members;
  let name = req.params.name;
  let githubUrl = req.params.githubUrl;
  let teamId = req.params.teamId;
  let admins = req.params.admins;

  let teamWithoutAdmins = {
    'course' : course_Id,
    'deliverable' : deliverable,
    'members' : newTeamMembers,
    'name' : name,
    'teamId' : teamId,
    'githubUrl' : githubUrl,
  };

  return Team.create(teamWithoutAdmins).catch(err => logger.info('Error creating course: ' + err));
};

let updateTeam = function(team_Id: string, updatedModel: ITeamDocument) {

  return Team.findOne({ '_id' : team_Id })
    .exec()
    .then( t => {
      if (t) {
        t.deliverable = updatedModel.deliverable;
        t.githubUrl = updatedModel.githubUrl;
        t.members = updatedModel.members;
        t.name = updatedModel.name;
        t.save();
      } else {
        Promise.reject('Unable to update team model.');
      }
    }).catch(err => logger.info(err));
};

function update(_req: any) {
  req = _req;
  let courseId: string = req.params.courseId;
  let deliverable: string = req.params.deliverable;
  let newTeamMembers: [Object] = req.params.updatedModel.members;
  let teamId: string = req.params.teamId;
  let updatedModel: ITeamDocument = req.params.updatedModel;

  let getTeamsUnderDeliverable = Team.find({ 'deliverable' : deliverable, '_id': { $nin : teamId } } )
    .populate('deliverable')
    .exec()
    .then( existingTeams => {
      return checkForDuplicateTeamMembers(existingTeams, newTeamMembers);
    })
    .catch(err => logger.info(err));

  return getTeamsUnderDeliverable
    .then( results => {
      console.log('ze results' + JSON.stringify(results));
      if (results !== true) {
        console.log('made it here');
        return updateTeam(teamId, updatedModel)
          .then( t => {
            return t;
          })
          .catch(err => 'Cannot create team' + err);
      }
      throw Error('Cannot add duplicate team members to deliverable.');
    });
}


// One student per deliverable --> Maps to these conditions:
// 1) Students must be unique on the team.
// 2) Amongst the teams that exist with a particular Deliverable ID,
//    students must also be unique.
// ---> These conditions ensure that students cannot be on multiple teams
//      per deliverable.
// 3) If no teams with deliverableId found, create new team.

function add(_req: any) {
  req = _req;
  let courseId = req.params.courseId;
  let deliverable = req.params.deliverable;
  let newTeamMembers = req.params.members;
  let name = req.params.name;
  let githubUrl = req.params.githubUrl;
  let teamId = req.params.teamId;
  let admins = req.params.admins;

  let getTeamsUnderDeliverable = Team.find({ 'deliverable' : deliverable })
    .populate('deliverable')
    .exec()
    .then( existingTeams => {
      return checkForDuplicateTeamMembers(existingTeams, newTeamMembers);
    })
    .catch(err => logger.info(err));

  let courseQuery = getTeamsUnderDeliverable.then( duplicateMembers => {
      return Course.findOne({ 'courseId' : courseId })
        .exec();
  })
  .catch(err => logger.info(err));

  return Promise.all([getTeamsUnderDeliverable, courseQuery])
    .then(function(results: any) {
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

export { add, update }
