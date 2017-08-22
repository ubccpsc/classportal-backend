import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { ITeamDocument, Team } from '../models/team.model';
import { ICourseDocument, Course } from '../models/course.model';
import { IUserDocument, User } from '../models/user.model';
import { IDeliverableDocument, Deliverable } from '../models/deliverable.model';
import GitHubManager from '../github/githubManager';
import * as auth from '../middleware/auth.middleware';

function getRepos(orgName: string): Promise<[Object]> {
  let githubManager = new GitHubManager(orgName);
  return githubManager.getRepos(orgName);
}

function createGithubTeam(payload: any): Promise<number> {
  let githubManager = new GitHubManager(payload.orgName);
  return githubManager.createTeam(payload.teamName, payload.permission)
    .then( (newTeam) => {
      return githubManager.addMembersToTeam(newTeam.teamId, payload.members);
    });
}

function getCourseTeamsPerUser(req: any): Promise<ITeamDocument[]> {
  let courseId = req.params.courseId;
  let userId = req.user._id;
  if (typeof req.params.courseId === undefined ||
      typeof req.user._id === undefined) {
    return Promise.reject(Error(`TeamController::getCourseTeamsPerUser
     courseId ${courseId} or userId ${userId} not in parameter.`));
  }
  let courseQuery = Course.findOne({ courseId }).exec();

  return courseQuery.then((course: ICourseDocument) => {
    let teamQueryObject: any = new Object();
    if (course) {
      teamQueryObject.course = course._id;
      teamQueryObject.members = userId;
      return Team.find(teamQueryObject)
        .populate('deliverable course TAs')
        .populate({ path: 'members', select: 'fname lname' })
        .exec()
        .then((teams: ITeamDocument[]) => {
          if (!teams) {
            return Promise.reject(Error(`TeamController::getCourseTeamsPerUser No teams were found under
            Course Number ${courseId} and User ${userId}`));
          }
          return Promise.resolve(teams);
        });
    }
    else {
      return Promise.reject(Error(`TeamController::getCourseTeamsPerUser Course was not 
      found under Course Number ${courseId} and User ${userId}`));
    }
  });
}

function createGithubRepo(payload: any): Promise<Object> {

  const SUPERADMIN = 'superadmin';
  const ADMIN = 'admin';
  const PULL = 'pull';
  const PUSH = 'push';

  let githubManager = new GitHubManager(payload.orgName);

  return githubManager.createRepo(payload.name)
    .then( (newRepoName) => {
      if (payload.importUrl != '') {
        return githubManager.importRepoToNewRepo(payload.name, payload.importUrl)
          .then( (results) => {
            return results;
          });
      }
      return newRepoName;
    })
    .then((newRepoName: string) => {

      // As repo is now created, add teams and members in Promise.All()

      let adminTeamNumbers = Promise.all(payload.adminTeams.map((teamName: string) => {
        return githubManager.getTeamNumber(teamName);
      }));
      let memberTeamNumbers = Promise.all(payload.memberTeams.map((teamName: string) => {
        return githubManager.getTeamNumber(teamName);
      }));
      let addAdmins = Promise.all(payload.admins.map((admin: string) => {
        return githubManager.addCollaboratorToRepo(admin, payload.name, ADMIN);
      }));
      let addMembers = Promise.all(payload.members.map((member: string) => {
        return githubManager.addCollaboratorToRepo(member, payload.name, PUSH);
      }));

      let addTeamsAndMembers = [adminTeamNumbers, memberTeamNumbers, addMembers, addAdmins];

      adminTeamNumbers.then( teamNums => {
        return Promise.all(teamNums.map( (teamNum: number) => {
          return githubManager.addTeamToRepo(teamNum, payload.name, ADMIN);
        }));
      });

      memberTeamNumbers.then( teamNums => {
        return Promise.all(teamNums.map( (teamNum: number) => {
          return githubManager.addTeamToRepo(teamNum, payload.name, PUSH);
        }));
      });

      return Promise.all(addTeamsAndMembers);
    });
}

function getTeams(payload: any) {
  return Course.findOne({ courseId: payload.courseId })
    .exec()
    .then( c => {
      return Team.find({ course: c._id })
      .select('teamId githubUrl TAs name members deliverable')
      .populate({
        path: 'TAs',
        select: 'fname lname csid snum -_id',
      })
      .populate({
        path: 'deliverable',
        select: 'name url open close -_id',
      })
      .populate({
        path: 'members',
        select: 'fname lname csid snum -_id',
      })
      .exec();
    });
}

function checkForDuplicateTeamMembers(existingTeams: ITeamDocument[], newTeamMembers: [Object]) {
  let duplicateEntry: boolean;
  let duplicatedMember: boolean;
  let userCompiliation = new Array();
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

let createTeam = function(course_Id: any, req: any) {
  let newTeam = {
    'course' : course_Id,
    'deliverable': req.params.deliverable,
    'members': new Array(),
    'name': req.params.name,
    'teamId': req.params.teamId,
    'githubUrl': req.params.githubUrl,
  };

  // Only add non-duplicates
  for ( let i = 0; i < req.params.members.length; i++) {
    let duplicateEntry = newTeam.members.some(function(member){
      return member == req.params.members[i];
    });
    if (!duplicateEntry) {
      newTeam.members.push(req.params.members[i]);
    }
  }

  return Team.create(newTeam);
};

let updateTeam = function(team_Id: string, updatedModel: ITeamDocument) {

  if ( updatedModel.members == null || updatedModel.TAs == null) {
    return Promise.reject(Error('Payload objects malformed. Cannot update team.'));
  }

  return Team.findOne({ '_id' : team_Id })
    .exec()
    .then( t => {
      if ( t === null) {
        return Promise.reject(Error('Team ID ' + team_Id + ' not found.'));
      }
      t.set('members', []);
      t.set('TAs', []);
      t.githubUrl = updatedModel.githubUrl;

      // Only add non-duplicates
      for (let i = 0; i < updatedModel.members.length; i++) {
        let duplicateEntry = t.members.some(function(member) {
          return member == updatedModel.members[i];
        });
        if (!duplicateEntry) {
          t.members.push(updatedModel.members[i]);
        }
      }
      t.name = updatedModel.name;

      // Only add non-duplicates
      for (let i = 0; i < updatedModel.TAs.length; i++) {
        let duplicateEntry = t.TAs.some(function(TA){
          return TA == updatedModel.TAs[i];
        });
        if (!duplicateEntry) {
          t.TAs.push(updatedModel.TAs[i]);
        }
      }
      return t.save();
    });
};

function isWithinTeamSize(courseObjectId: string, teamSize: number) {

  let minTeamSize: number;
  let maxTeamSize: number;

  if (teamSize !== null && teamSize > 0 ) {
    return Course.findOne({ '_id' : courseObjectId })
    .exec()
    .then( c => {
      minTeamSize = c.minTeamSize;
      maxTeamSize = c.maxTeamSize;
    })
    .then( (c) => {
      if (teamSize < minTeamSize) {
        return Promise.reject(Error('Cannot create team. The minimum team size is ' + minTeamSize + '.'));
      } else if (teamSize > maxTeamSize) {
        return Promise.reject(Error('Cannot create team. The maximum team size is ' + maxTeamSize + '.'));
      }
      return Promise.resolve(true);
    });
  } else {
    return Promise.reject(Error('Cannot add team without team members.'));
  }
}

function update(req: any) {

  let courseId: string = req.params.courseId;
  let deliverable: string = req.params.deliverable;
  let newTeamMembers: [Object] = req.params.updatedModel.members;
  let teamId: string = req.params.teamId;
  let name: string = req.params.updatedModel.name;
  let updatedModel: ITeamDocument = req.params.updatedModel;

  let getTeamsUnderDeliverable = Team.find({ 'deliverable' : deliverable, '_id': { $nin : teamId } } )
    .populate('deliverable')
    .exec()
    .then( existingTeams => {
      if (existingTeams !== null) {
        return Promise.resolve(checkForDuplicateTeamMembers(existingTeams, newTeamMembers));
      } else {
        return Promise.reject(Error('Unable to find team with deliverable ' + deliverable + ' in payload.'));
      }
    });

  return getTeamsUnderDeliverable
    .then( results => {
      if (results !== null) {
        return updateTeam(teamId, updatedModel);
      }
      return Promise.reject(Error('Cannot add duplicate team members to deliverable.'));
    });
}


// One student per deliverable --> Maps to these conditions:
// 1) Students must be unique on the team.
// 2) Amongst the teams that exist with a particular Deliverable ID,
//    students must also be unique.
// ---> These conditions ensure that students cannot be on multiple teams
//      per deliverable.
// 3) If no teams with deliverableId found, create new team.

function add(req: any) {
  let courseId = req.params.courseId;
  let deliverable = req.params.deliverable;
  let newTeamMembers = req.params.members;
  let name = req.params.name;
  let githubUrl = req.params.githubUrl;
  let teamId = req.params.teamId;
  let teamSize: number;


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
        return isWithinTeamSize(results[1]._id, req.params.members.length)
          .then( () => {
            return createTeam(results[1]._id, req);
          });
      }
      throw Error('Cannot add duplicate team members to deliverable.');
    });
}

export { add, update, getTeams, createGithubTeam, createGithubRepo, getRepos, getCourseTeamsPerUser }
