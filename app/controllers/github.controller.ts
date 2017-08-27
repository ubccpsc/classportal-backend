import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { ITeamDocument, Team } from '../models/team.model';
import { ICourseDocument, Course } from '../models/course.model';
import { IUserDocument, User } from '../models/user.model';
import { IDeliverableDocument, Deliverable } from '../models/deliverable.model';
import GitHubManager, { GroupRepoDescription } from '../github/githubManager';
import * as auth from '../middleware/auth.middleware';
  // const ORG_NAME = 'CS310-2016Fall';
  const ORG_NAME = 'CPSC310-2017W-T2';

  // all projects will start with this (e.g., cpsc310project_team12)
  const PROJECT_PREFIX = 'cpsc310project_team';

  // all teams will start with this (e.g., cpsc310_team12)
  const TEAM_PREFIX = 'cpsc310_team';

  // the team containing all of the TAs
  const STAFF_TEAM = '310staff';

  // the endpoint for AutoTest (null if you do not want these)
  const WEBHOOK_ENDPOINT = 'http://portal.cs.ubc.ca:11311/submit';

  // this is the
  const IMPORTURL = 'https://github.com/CS310-2017Jan/bootstrap';

  // if we want to delete projects instead of creating them. be careful with this!
  const CLEAN = false;
  
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

function deleteRepos(payload: any): Promise<[string]> {
  let githubManager = new GitHubManager(payload.orgName);

  return Promise.all([payload.repoNames.map( (name: string) => {
    return githubManager.deleteRepo(name);
  })]);
}

function createTeamName(course: ICourseDocument, delivName: string, teamNum: string) {
  const CPSC_PREPENDAGE = 'cpsc';
  let courseSettings = course.settings;

  if (courseSettings.markDelivsByBatch) {
    let teamName = `${CPSC_PREPENDAGE}${course.courseId}_${teamNum}`;
    return teamName;
  }
  else {
    let teamName = `${CPSC_PREPENDAGE}${course.courseId}_${delivName}_${teamNum}`;
    return teamName;
  }
}

function createGithubReposForTeams(payload: any): Promise<Object> {

  const ADMIN = 'admin';
  const PULL = 'pull';
  const PUSH = 'push';

  let githubManager = new GitHubManager(payload.githubOrg);
  let course: ICourseDocument;
  let courseSettings: any;
  let teams: ITeamDocument[];
  let inputGroup: GroupRepoDescription;

  return Course.findOne({ courseId: payload.courseId }).exec()
    .then((_course: ICourseDocument) => {
      if (_course) {
        course = _course;
        courseSettings = _course.settings;
      } else { throw `Could not find course ${payload.courseId}`; }
      return getTeamsToBuild(course);
    })
    .then((_teams: ITeamDocument[]) => {
      // for (let i = 0; i < _teams.length; i++) {
      //   let teamName = createTeamName(course, payload.deliverableName, _teams[i].name);
      //   githubManager.createRepo(teamName)
      //     .then((newRepoName: string) => {
      //       if (newRepoName != '') {
      //         return githubManager.importRepoToNewRepo(teamName, payload.importUrl)
      //           .then((results: any) => {
      //             return results;
      //           });
      //       }
      //       return newRepoName;
      //     });
      // }

      for (let i = 0; i < _teams.length; i++) {
        let inputGroup = {
          teamName: createTeamName(course, payload.deliverableName, _teams[i].name),
          members: ['stecler' , 'thekitsch'],
          projectName: createTeamName(course, payload.deliverableName, _teams[i].name),
          teamIndex: 1,
          team: 1,
        };
        githubManager.completeTeamProvision(inputGroup, IMPORTURL, STAFF_TEAM, WEBHOOK_ENDPOINT);
      }
      return _teams;
    });

    function getTeamsToBuild(course: ICourseDocument) {
      return Team.find({ courseId: course._id })
        .then((_teams: ITeamDocument[]) => {
          if (!_teams) {
            throw `No Teams found`;
          }
          teams = _teams;
          return _teams;
        })
        .catch(err => {
          logger.error(`Github.Controller::getTeamsToBuild() ERROR ${err}`);
        });
        
    }

  // return githubManager.createRepo(payload.name)
  //   .then( (newRepoName) => {
  //     if (payload.importUrl != '') {
  //       return githubManager.importRepoToNewRepo(payload.name, payload.importUrl)
  //         .then( (results) => {
  //           return results;
  //         });
  //     }
  //     return newRepoName;
  //   })
  //   .then((newRepoName: string) => {

  //     // As repo is now created, add teams and members in Promise.All()

  //     let adminTeamNumbers = Promise.all(payload.adminTeams.map((teamName: string) => {
  //       return githubManager.getTeamNumber(teamName);
  //     }));
  //     let memberTeamNumbers = Promise.all(payload.memberTeams.map((teamName: string) => {
  //       return githubManager.getTeamNumber(teamName);
  //     }));
  //     let addAdmins = Promise.all(payload.admins.map((admin: string) => {
  //       return githubManager.addCollaboratorToRepo(admin, payload.name, ADMIN);
  //     }));
  //     let addMembers = Promise.all(payload.members.map((member: string) => {
  //       return githubManager.addCollaboratorToRepo(member, payload.name, PUSH);
  //     }));

  //     let addTeamsAndMembers = [adminTeamNumbers, memberTeamNumbers, addMembers, addAdmins];

  //     adminTeamNumbers.then( teamNums => {
  //       return Promise.all(teamNums.map( (teamNum: number) => {
  //         console.log('Adding admin teamNum to repo: ' + teamNum);
  //         return githubManager.addTeamToRepo(teamNum, payload.name, ADMIN);
  //       }));
  //     });

  //     memberTeamNumbers.then( teamNums => {
  //       return Promise.all(teamNums.map( (teamNum: number) => {
  //         console.log('Adding member teamNum to repo: ' + teamNum);
  //         return githubManager.addTeamToRepo(teamNum, payload.name, PUSH);
  //       }));
  //     });

  //     return Promise.all(addTeamsAndMembers);
  //   });
}

function createGithubReposForProjects(payload: any): Promise<Object> {

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
          console.log('Adding admin teamNum to repo: ' + teamNum);
          return githubManager.addTeamToRepo(teamNum, payload.name, ADMIN);
        }));
      });

      memberTeamNumbers.then( teamNums => {
        return Promise.all(teamNums.map( (teamNum: number) => {
          console.log('Adding member teamNum to repo: ' + teamNum);
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

export { getTeams, createGithubTeam, createGithubReposForTeams, createGithubReposForProjects,
        getRepos, deleteRepos };