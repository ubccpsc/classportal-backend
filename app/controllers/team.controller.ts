import * as restify from 'restify';
import {logger} from '../../utils/logger';
import {ITeamDocument, Team} from '../models/team.model';
import {ICourseDocument, Course} from '../models/course.model';
import {IUserDocument, User} from '../models/user.model';
import {IDeliverableDocument, Deliverable} from '../models/deliverable.model';
import {GithubState, GithubRepo, defaultGithubState} from '../models/github.interfaces';
import GitHubManager from '../github/githubManager';
import * as auth from '../middleware/auth.middleware';

const TEAM_PREPENDAGE = 'team';


// One problem with this just being functions like this instead of having them in a class
// is that we can't distinguish between the public interface and the private interface.

export class ITeamError {
  public status: string;
  public message: string;
}

export class TeamController {

  public getUserTeam(courseId: string, userName: string): ITeamDocument | ITeamError {
    try {
      let team = this.queryUserTeam(courseId, userName);
      if (team === null) {
        return {status: 'error', message: `You are not on any teams under ${courseId}.`};
      } else {
        return team;
      }
    } catch (err) {
      logger.error('TeamController::getUserTeam() - ERROR: ' + err.message);
      return {status: 'error', message: err.message};
    }
  }

  public getAllTeams(courseId: string): ITeamDocument[] | ITeamError {
    try {
      let teams = this.queryAllTeams(courseId);
      return teams;
    } catch (err) {
      logger.error('TeamController::getAllTeams() - ERROR: ' + err.message);
      return {status: 'error', message: err.message};
    }
  }

  /**
   * NOTE: This is missing the deliv aspect. We need to think a bit harder about how tying teams to multiple deliverables works.
   *
   * @param courseId
   * @param userNames
   * @param isAdmin
   * @returns {{status: string, message: string}}
   */
  public createTeam(courseId: string, userNames: string[], isAdmin: boolean) {

    let users = [];
    let alreadyOnTeam = [];
    for (let userName of userNames) {
      let user = this.getUserTeam(courseId, userName);
      if (user === null) {
        users.push(userName);
      } else {
        alreadyOnTeam.push(userName);
      }
    }

    // even admins can't put someone on a team who is already teamed up
    if (alreadyOnTeam.length > 0) {
      return {status: 'error', message: 'Some user(s) are already on teams: ' + JSON.stringify(alreadyOnTeam)};
    }

    if (isAdmin === true) {
      // ignore safeguards
    } else {
      const MIN_MEMBERS = 1; // should come from somewhere
      const MAX_MEMBERS = 1; // should come from somewhere

      if (users.length < MIN_MEMBERS) {
        return {status: 'error', message: 'Insufficient members specified'};
      }

      if (users.length > MAX_MEMBERS) {
        return {status: 'error', message: 'Too many members specified'};
      }
    }

    try {
      let team = this.queryCreateTeam(courseId, users);
      return team;
    } catch (err) {
      logger.error('TeamController::createTeam() - ERROR: ' + err.message);
      return {status: 'error', message: err.message};
    }


  }

  /**
   *
   * @param courseId
   * @param userName
   * @returns {ITeamDocument | null} the user's ITeamDocument for that course (if it exists) or null.
   */
  private queryUserTeam(courseId: string, userName: string): ITeamDocument | null {
    return null;
  }

  /**
   *
   * @param courseId
   * @returns {ITeamDocument} if no teams returns []
   */
  private queryAllTeams(courseId: string): ITeamDocument[] {
    return null;
  }

  /**
   *
   * @param courseId
   * @param users
   * @returns {ITeamDocument} the created team document
   */
  private queryCreateTeam(courseId: string, users: string[]): ITeamDocument {
    return null;
  }

}


function getMyTeams(req: any) {

  let user: IUserDocument;
  let course: ICourseDocument;
  let deliv: IDeliverableDocument;
  return User.findOne({username: req.user.username})
    .then((_user: IUserDocument) => {
      if (_user) {
        user = _user;
        return _user;
      }
      throw `Could not find user ${req.user.username}`;
    })
    .then((_user: IUserDocument) => {
      return Course.findOne({courseId: req.params.courseId})
        .then((course: ICourseDocument) => {
          if (course) {
            return course;
          }
          throw `Could not find course ${req.params.courseId}`;
        })
        .catch(err => {
          logger.error(`TeamController::getMyTeams() ERROR ${err}`);
        });
    })
    .then((course: ICourseDocument) => {
      return Team.findOne({courseId: course._id, members: user._id, '$where': 'this.deliverableIds.length > 0'})
        .populate({
          path:   'members deliverableIds deliverableId',
          select: 'username _id name url gradesReleased open close',
        })
        .then((team: ITeamDocument) => {
          if (team) {
            return team;
          }
          else {
            return `You are not on any teams under ${req.params.courseId}.`;
          }
        });
    })
    .catch(err => {
      logger.error(`TeamController::getMyTeams() ERROR ${err}`);
    });
}

function getUsersNotOnTeam(payload: any) {

  let markByBatchFlag: boolean;
  let course: ICourseDocument;

  return Course.findOne({courseId: payload.courseId})
    .then((_course: ICourseDocument) => {
      course = _course;
      markByBatchFlag = payload.markInBatch;
      return _course;
    })
    .then((course) => {

      let teamQuery: any = {courseId: course._id};
      if (markByBatchFlag) {
        teamQuery.deliverableIds = {'$in': course.deliverables};
      }
      else {
        teamQuery.deliverableId = {'$in': course.deliverables};
      }

      return Team.find(teamQuery).exec()
        .then((teams: ITeamDocument[]) => {
          return teams;
        });
    })
    .then((teams: ITeamDocument[]) => {
      if (teams.length == 0) {
        throw `ERROR. No Teams found.`;
      }
      // create a list of the team members under that class or class deliverable
      let usersOnTeam: any = new Array();

      for (let i = 0; i < teams.length; i++) {
        for (let j = 0; j < teams[i].members.length; j++) {
          let teamMember = teams[i].members[j];
          if (usersOnTeam.indexOf(teamMember) < 0) {
            console.log(teamMember);

            // a trick to get these to appear as simple strings Part 1/2
            usersOnTeam.push(teamMember.toString());
          }
        }
      }
      return usersOnTeam;
    })
    .then((usersOnTeam: string[]) => {
      // compare Users on Team to the ClassList. Return those that are on the classList but
      // not on the Team
      let notOnTeam = course.classList.filter(function (obj) {

          // a trick to get these to appear as simple strings Part 2/2
          let newObj = obj.toString();
          return usersOnTeam.indexOf(newObj) == -1;
        }
      );
      return notOnTeam;
    })
    .then((notOnTeam: string[]) => {
      return User.find({_id: {'$in': notOnTeam}}).select('username fname lname _id');
    });
}

function getRepos(orgName: string): Promise<[Object]> {
  let githubManager = new GitHubManager(orgName);
  return githubManager.getRepos(orgName);
}

function createGithubTeam(payload: any): Promise<number> {
  let githubManager = new GitHubManager(payload.orgName);
  return githubManager.createTeam(payload.teamName, payload.permission)
    .then((newTeam) => {
      return githubManager.addMembersToTeam(newTeam.teamId, payload.members);
    });
}

/**
 @param <ICourseDocument> Course model that contains valid Github Org Names
 @param <string> a Github Org Name to test for validity
 @return <bool> true if valid
 **/
function validGithubOrg(course: ICourseDocument, testOrgName: string): Boolean {
  console.log(course.githubOrg.indexOf(testOrgName) >= 0);
  if (course.githubOrg.indexOf(testOrgName) >= 0) {
    return true;
  } else {
    return false;
  }
}

/**
 ** Note: params in Payload
 @param <ICourseDocument> Course model that contains valid Github Org Names
 @param <string> a Github Org Name to test for validity
 @param <string> a Deliverable name, ie. 'd1'
 @return <bool> true if valid
 Queries course, then queries deliverable, then creates Team.
 **/
function createTeam(req: any): Promise<ITeamDocument> {
  let payload = req.params;
  let newTeam: any = new Object();
  let delivQueryObject: any = {name: payload.deliverableName};
  newTeam.githubOrg = payload.githubOrg;
  newTeam.members = [];

  let courseQuery = Course.findOne({courseId: payload.courseId})
    .exec()
    .then((course: ICourseDocument) => {
      if (course) {
        newTeam.courseId = course._id;
      } else {
        throw `Could not find course ${payload.courseId}`;
      }

      let isValidOrg: Boolean = validGithubOrg(course, payload.githubOrg);

      if (isValidOrg) {
        return course;
      } else {
        throw `Invalid Github Organization submitted`;
      }
    })
    .catch(err => {
      logger.error(`courseQuery() ERROR ${err}`);
    });

  function deliverableQuery() {
    return Deliverable.findOne({name: payload.deliverableName, courseId: newTeam.courseId})
      .exec()
      .then((deliverable: IDeliverableDocument) => {
        if (deliverable) {
          newTeam.deliverableId = deliverable._id;
          return deliverable;
        }
        throw `Could not find deliverable ${payload.deliverableName}`;
      })
      .catch(err => {
        logger.error(`deliverableQuery() ERROR ${err}`);
      });
  }

  return courseQuery
    .then((course) => {
      return deliverableQuery();
    })
    .then(() => {
      return Promise.resolve(Team.findOrCreate(newTeam));
    })
    .catch(err => {
      logger.error(`TeamController::createTeam() Promise.all() ERROR ${err}`);
    });
}

function getCourseTeamsWithBatchMarking(payload: any): Promise<ITeamDocument[]> {


  let courseId = payload.courseId;

  let courseQuery = Course.findOne({courseId}).exec();

  return courseQuery.then((course: ICourseDocument) => {
    let teamQueryObject: any = new Object();
    if (course) {
      return Team.find({courseId: course._id, $where: 'this.deliverableIds.length > 0'})
        .populate({path: 'members', select: 'fname lname username'})
        .populate({path: 'deliverableIds'})
        .exec()
        .then((teams: ITeamDocument[]) => {
          if (!teams) {
            return Promise.reject(Error(`TeamController::getCourseTeamsPerUser No teams were found under
            Course Number ${courseId}`));
          }
          return Promise.resolve(teams);
        });
    }
    else {
      return Promise.reject(Error(`TeamController::getCourseTeamsPerUser Course was not 
      found under Course Number ${courseId}`));
    }
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
  let courseQuery = Course.findOne({courseId}).exec();

  return courseQuery.then((course: ICourseDocument) => {
    let teamQueryObject: any = new Object();
    if (course) {
      teamQueryObject.course = course._id;
      teamQueryObject.members = userId;
      return Team.find(teamQueryObject)
        .populate('deliverable course TAs')
        .populate({path: 'members', select: 'fname lname'})
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
    .then((newRepoName) => {
      if (payload.importUrl != '') {
        return githubManager.importRepoToNewRepo(payload.name, payload.importUrl)
          .then((results) => {
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

      adminTeamNumbers.then(teamNums => {
        return Promise.all(teamNums.map((teamNum: number) => {
          return githubManager.addTeamToRepo(teamNum, payload.name, ADMIN);
        }));
      });

      memberTeamNumbers.then(teamNums => {
        return Promise.all(teamNums.map((teamNum: number) => {
          return githubManager.addTeamToRepo(teamNum, payload.name, PUSH);
        }));
      });

      return Promise.all(addTeamsAndMembers);
    });
}

function getTeams(payload: any) {
  return Course.findOne({courseId: payload.courseId})
    .exec()
    .then(c => {
      return Team.find({course: c._id})
        .select('teamId githubUrl TAs name members deliverable')
        .populate({
          path:   'TAs',
          select: 'fname lname csid snum -_id',
        })
        .populate({
          path:   'deliverable',
          select: 'name url open close -_id',
        })
        .populate({
          path:   'members',
          select: 'fname lname csid snum -_id',
        })
        .exec();
    });
}

// if markInBatch is true in payload.markInBatch, then
// teams will be created with multiple Deliverables under CourseSettings.
// if not true, Teams will be created with the specified single Deliverable property
// in payload.deliverableName;
/**
 *
 * // under payload param
 * @param markInBatch type of boolean
 * @param deliverableName: ie. "d1", etc.
 * @param members array of github usernames
 * @param courseId - ie. 310
 */
function createCustomTeam(req: any, payload: any) {
  let course: ICourseDocument;
  let deliv: IDeliverableDocument;
  let delivs: IDeliverableDocument[];
  let team: ITeamDocument;
  let user: IUserDocument;

  const CURRENT_USER: string = req.user.username;
  const STUDENT_ROLE: string = 'student';

  return Course.findOne({courseId: payload.courseId})
    .populate('classList')
    .exec()
    .then((_course: ICourseDocument) => {
      if (_course) {
        course = _course;
        return _course;
      } else {
        throw `Could not find course ${payload.courseId}`;
      }
    })
    .then(() => {
      return User.findOne({username: CURRENT_USER})
        .exec()
        .then((_user: IUserDocument) => {
          user = _user;
        });
    })
    .then(() => {
      return Deliverable.findOne({name: payload.deliverableName, courseId: course._id})
        .exec()
        .then((_deliv: IDeliverableDocument) => {
          if (_deliv) {
            deliv = _deliv;
          }
          return _deliv;
        })
        .catch(err => {
          logger.error(`TeamController::createCustomTeam() Deliverable.findOne() ERROR ${err}`);
        });
    })
    .then(() => {
      return Deliverable.find({courseId: course._id, markInBatch: true})
        .then((_delivs: IDeliverableDocument[]) => {
          if (_delivs) {
            delivs = _delivs;
            return _delivs;
          } else {
            throw `Could not find Deliverables for markByBatch under course ${course.courseId}`;
          }
        })
        .catch(err => {
          logger.error(`TeamController::createCustomTeam() Deliverable.find() ERROR ${err}`);
        });
    })
    .then(() => {
      return validateGithubNames(payload.members, course);
    })
    .then((validTeamMembers: boolean) => {
      console.log('IS IT VALID 2', validTeamMembers);
      if (validTeamMembers && payload.markInBatch) {
        return checkIfMembersOnTeamByBatch(payload.members, delivs);
      } else if (validTeamMembers && typeof payload.markInBatch == 'undefined') {
        return checkIfMembersOnTeamBySingDeliv(payload.members, deliv);
      } else {
        throw `Invalid team member list submitted. At least one user does not exist in database.`;
      }
    })
    .then((membersAlreadyOnTeam: boolean) => {
      if (membersAlreadyOnTeam) {
        throw `Members are already on team. Cannot add team member to multiple teams per 
          deliverable or sets of deliverables`;
      } else if (payload.members.length > course.maxTeamSize && user.userrole === STUDENT_ROLE) {
        throw `Cannot have a team larger than ${course.maxTeamSize}`;
      } else if (payload.markInBatch) {
        return createTeamObjectsForBatchMarking(payload.members);
      }
      else {
        return createTeamObjectsForSingDelivMarking(payload.members);
      }
    })
    .then((newTeamInsertList: any) => {
      return insertTeamDocuments(newTeamInsertList);
    });

  function createTeamObjectsForBatchMarking(teamIdList: string[]) {

    let userIds: string[] = [];
    console.log('teamIdList, eh', teamIdList);
    return User.find({username: {'$in': teamIdList}})
      .exec()
      .then((users: IUserDocument[]) => {
        if (users) {
          users.map((user: IUserDocument) => {
            userIds.push(user._id);
          });
          return userIds;
        } else {
          throw `Could not find User Ids for team creation in ${teamIdList}`;
        }
      })
      .then((userIds: any) => {
        let bulkInsertArray = new Array();
        if (delivs.length > 0) {
          let deliverableIds = new Array();

          for (let i = 0; i < delivs.length; i++) {
            deliverableIds.push(delivs[i]._id);
          }

          let teamObject = {
            courseId:    course._id,
            deliverableIds,
            members:     userIds,
            githubState: defaultGithubState,
          };
          bulkInsertArray.push(teamObject);

        } else {
          throw `Could not find Deliverables for ${payload.deliverableName} and ${course._id}`;
        }

        // adds the team number Name property used by AutoTest
        let counter = course.batchTeamCount + 1;
        for (let i = 0; i < bulkInsertArray.length; i++) {
          bulkInsertArray[i].name = TEAM_PREPENDAGE + counter;
        }
        course.batchTeamCount = counter;
        course.save();

        return bulkInsertArray;
      })
      .catch(err => {
        logger.error(`TeamController::createCustomTeam() createTeamObjectsForBatchMarking() ERROR ${err}`);
      });
  }


  function createTeamObjectsForSingDelivMarking(teamIdList: string[]) {

    let userIds: string[] = [];
    return User.find({username: {'$in': teamIdList}})
      .exec()
      .then((users: IUserDocument[]) => {
        if (users) {
          users.map((user: IUserDocument) => {
            userIds.push(user._id);
          });
          return userIds;
        } else {
          throw `Could not find User Ids for team creation in ${teamIdList}`;
        }
      })
      .then((userIds: any) => {
        let bulkInsertArray = new Array();
        if (deliv) {
          let deliverableId = deliv._id;

          for (let i = 0; i < userIds.length; i++) {
            let teamObject = {
              courseId:    course._id,
              deliverableId,
              members:     userIds,
              githubState: defaultGithubState,
            };
            bulkInsertArray.push(teamObject);
          }
        } else {
          throw `Could not find Deliverables for ${payload.deliverableName} and ${course._id}`;
        }

        // adds the team number Name property used by AutoTest
        let counter = teamIdList.length + 1;
        for (let i = 0; i < bulkInsertArray.length; i++) {
          bulkInsertArray[i].name = TEAM_PREPENDAGE + counter;
          counter++;
        }

        return bulkInsertArray;
      })
      .catch(err => {
        logger.error(`TeamController::createCustomTeam() createTeamObjectsForBatchMarking() ERROR ${err}`);
      });
  }

  function validateGithubNames(teamMembers: string[], course: ICourseDocument): boolean {
    console.log('members', teamMembers);

    let classList: any = course.classList;
    let validTeamMembers: boolean = true;

    for (let i = 0; i < teamMembers.length; i++) {
      let thisItemIsValid: boolean = false;
      let teamMember: string = teamMembers[i].toString();
      for (let j = 0; j < classList.length; j++) {
        let classListUser = classList[j].username;
        console.log(teamMember.indexOf(classListUser));
        if (teamMember === classListUser) {
          thisItemIsValid = true;
        }
      }
      if (!thisItemIsValid) {
        validTeamMembers = false;
      }
    }
    return validTeamMembers;
  }

  function checkIfMembersOnTeamByBatch(teamMembers: string[], deliverables: IDeliverableDocument[]) {

    return Team.find({courseId: course.id, deliverableIds: {'$in': deliverables}})
      .populate('members')
      .then((teams: ITeamDocument[]) => {
        let usersOnTeams: any = [];
        let isOnTeam: boolean = false;
        // console.log('teams', teams);
        console.log('teamMembers1', teamMembers);
        if (teams) {
          teams.map((team: ITeamDocument) => {
            for (let i = 0; i < team.members.length; i++) {
              usersOnTeams.push(team.members[i].username);
            }
          });
        }
        console.log('usersOnTeams', usersOnTeams);
        console.log('teamMembers', teamMembers);
        console.log('Users On Teams', usersOnTeams);
        for (let i = 0; i < usersOnTeams.length; i++) {
          let userToAdd: string = usersOnTeams[i].toString();
          for (let j = 0; j < teamMembers.length; j++) {
            let newTeamMember: string = teamMembers[j].toString();
            if (userToAdd === newTeamMember) {
              isOnTeam = true;
              console.log('Matched user' + userToAdd, newTeamMember);
            }
          }
        }
        return isOnTeam;
      });
  }

  function checkIfMembersOnTeamBySingDeliv(teamMembers: string[], deliverable: IDeliverableDocument) {

    return Team.findOne({courseId: course.id, deliverableId: deliverable._id})
      .populate('members')
      .then((teams: ITeamDocument) => {
        let usersOnTeams: any = [];
        let isOnTeam: boolean = false;
        // console.log('teams', teams);
        console.log('teamMembers1', teamMembers);
        if (team) {
          for (let i = 0; i < team.members.length; i++) {
            usersOnTeams.push(team.members[i].username);
          }
        }
        console.log('usersOnTeams', usersOnTeams);
        console.log('teamMembers', teamMembers);
        console.log('Users On Teams', usersOnTeams);
        for (let i = 0; i < usersOnTeams.length; i++) {
          let userToAdd: string = usersOnTeams[i].toString();
          for (let j = 0; j < teamMembers.length; j++) {
            let newTeamMember: string = teamMembers[j].toString();
            if (userToAdd === newTeamMember) {
              isOnTeam = true;
              console.log('Matched user' + userToAdd, newTeamMember);
            }
          }
        }
        return isOnTeam;
      });
  }
}

// if markInBatch is true in payload.markInBatch, then
// teams will be created with multiple Deliverables under CourseSettings.
// if not true, Teams will be created with the specified single Deliverable property
// in payload.deliverableName;
/**
 *
 * // under payload param
 * @param markInBatch type of boolean
 * @param teamSize: The max team size we will create
 * @param deliverableName: ie. "d1", etc.
 * @param courseId - ie. 310
 */
function randomlyGenerateTeamsPerCourse(payload: any) {
  let course_id: string;
  let course: ICourseDocument;
  let deliverable: IDeliverableDocument;
  let teams: ITeamDocument[];

  return Course.findOne({courseId: payload.courseId})
    .exec()
    .then((_course: ICourseDocument) => {
      if (_course) {
        course_id = _course._id;
        course = _course;
        return _course;
      }
      throw `Could not find course ${payload.courseId}`;
    })
    .then((course: ICourseDocument) => {
      return Deliverable.findOne({courseId: course._id, name: payload.deliverableName})
        .then((_deliv: IDeliverableDocument) => {
          if (_deliv) {
            deliverable = _deliv;
            return _deliv;
          }
          throw `No deliverable found under ${course.courseId} and ${payload.deliverableName}`;
        })
        .catch(err => {
          logger.error(`TeamController::Deliverable.findOne() ERROR ${err}`);
        });
    })
    .then((_deliv: IDeliverableDocument) => {
      if (payload.markInBatch) {
        // 'if' entails that we want to cross-check Deliverables and Teams to ensure
        // students are now already on team for those Deliverables
        return getDeliverables(course).then((delivs: IDeliverableDocument[]) => {
          return Team.find({courseId: course.id, deliverableIds: {'$in': delivs}})
            .then((_teams: ITeamDocument[]) => {
              teams = _teams;
              let filteredUsers: any;
              if (_teams.length > 0) {
                filteredUsers = filterUsersAlreadyInTeam(_teams);
                return splitUsersIntoArrays(filteredUsers);
              }
              return splitUsersIntoArrays(course.classList);
            })
            .catch(err => {
              logger.error(`TeamController::getDeliverables() filterByTeams() markByBatch ERROR ${err}`);
            });
        })
          .catch(err => {
            logger.error(`getDeliverables(${course.courseId}) ${err}`);
          });
      }
      else {
        // else entails that we only want to cross-check team members to see if they are already
        // on a team with this respective DeliverableId
        return Team.find({courseId: course.id, deliverableId: deliverable._id})
          .then((teams: ITeamDocument[]) => {
            let filteredUsers: any = filterUsersAlreadyInTeam(teams);
            console.log('splitUsersIntoArrays', splitUsersIntoArrays(filteredUsers));
            return splitUsersIntoArrays(filteredUsers);
          })
          .catch(err => {
            logger.error(`TeamController::getDeliverables() filterByTeams() singleDeliv ERROR ${err}`);
          });
      }
    })
    .then((sortedTeamIdList: string[][]) => {
      return createTeamForEachTeamList(sortedTeamIdList);
    })
    .catch(err => {
      logger.error(`TeamController::randomlyGenerateTeamsPerCourse ERROR ${err}`);
    });

  function createTeamForEachTeamList(sortedTeamIdList: string[][]) {
    let bulkInsertArray: any;
    if (payload.markInBatch) {
      // bulkInsertArray = createTeamObjectsForBatchMarking();
      return createTeamObjectsForBatchMarking()
        .then((_teams: any) => {
          return insertTeamDocuments(_teams);
        });
    } else {
      return createTeamObjectsForSingleDelivMarking()
        .then((_teams: any) => {
          return insertTeamDocuments(_teams);
        });
    }

    function createTeamObjectsForSingleDelivMarking() {
      let teams: ITeamDocument[];
      return getDeliverable(payload.deliverableName, course)
        .then((deliv: IDeliverableDocument) => {
          return Team.find({courseId: course._id, deliverableId: deliv._id})
            .then((_teams: ITeamDocument[]) => {
              teams = _teams;
              // if (teams.length > 0) {
              //   throw `Teams already exist for Deliverable. Cannot generate teams.`;
              // }
              return false;
            })
            .then((teamsExist: Boolean) => {
              if (!teamsExist) {
                let bulkInsertArray = new Array();
                if (deliv) {

                  for (let i = 0; i < sortedTeamIdList.length; i++) {
                    let teamObject = {
                      courseId:      course_id,
                      deliverableId: deliv._id,
                      members:       sortedTeamIdList[i],
                      githubState:   defaultGithubState,
                    };
                    bulkInsertArray.push(teamObject);
                  }
                } else {
                  throw `Could not find Deliverable for ${payload.deliverableName} and ${course._id}`;
                }

                // adds the team number Name property used by AutoTest
                let counter = teams.length + 1;
                if (deliverable.projectCount !== 0) {
                  counter = deliverable.projectCount;
                }
                console.log('counter,', counter);
                for (let i = 0; i < bulkInsertArray.length; i++) {
                  bulkInsertArray[i].name = TEAM_PREPENDAGE + counter;
                  counter++;
                }

                deliverable.projectCount = counter;
                deliverable.save();

                return bulkInsertArray;
              }
              return bulkInsertArray;
            });
        })
        .catch(err => {
          logger.error(`TeamController::createTeamForEachTeamList() --> 
              createTeamObjectsForSingleDelivMarking() ERROR ${err}`);
        });
    }

    function checkIfTeamsAlreadyExistForBatch(delivs: IDeliverableDocument[], course: ICourseDocument) {
      return Team.find({courseId: course._id, 'deliverableIds': {'$in': delivs}})
        .then((teams: ITeamDocument[]) => {
          if (teams.length > 0) {
            return true;
          }
          return false;
        });
    }

    function createTeamObjectsForBatchMarking() {
      return getDeliverables(course)
        .then((delivs: IDeliverableDocument[]) => {
          return checkIfTeamsAlreadyExistForBatch(delivs, course)
            .then((teamsExist: Boolean) => {
              // if (teamsExist) {
              //   throw `Teams already exist. Please remove teams before generating new teams`;
              // }
              return delivs;
            })
            .catch((err: any) => {
              logger.error(`TeamController::createTeamForEachTeamList() --> 
                  createTeamObjectsForBatchMarking() ERROR ${err}`);
              return Promise.reject(err);
            });
        })
        .then((delivs: IDeliverableDocument[]) => {
          let bulkInsertArray = new Array();
          if (delivs.length > 0) {
            let deliverableIds = new Array();

            for (let i = 0; i < delivs.length; i++) {
              deliverableIds.push(delivs[i]._id);
            }

            for (let i = 0; i < sortedTeamIdList.length; i++) {
              let teamObject = {
                courseId:    course_id,
                deliverableIds,
                members:     sortedTeamIdList[i],
                githubState: defaultGithubState,
              };
              bulkInsertArray.push(teamObject);
            }
          } else {
            throw `Could not find Deliverables for ${payload.deliverableName} and ${course._id}`;
          }

          // adds the team number Name property used by AutoTest
          let counter = teams.length + 1;
          for (let i = 0; i < bulkInsertArray.length; i++) {
            bulkInsertArray[i].name = TEAM_PREPENDAGE + counter;
            counter++;
          }

          return bulkInsertArray;
        })
        .catch((err: any) => {
          logger.error(`TeamController::createTeamForEachTeamList ERROR ${err}`);
        });
    }
  }

  // Gets Deliverables for course with markInBatch flag set to true
  function getDeliverables(course: ICourseDocument) {
    let deliverableIds: any = [];
    return Deliverable.find({courseId: course_id, markInBatch: true}).exec()
      .then((deliverables: IDeliverableDocument[]) => {
        if (deliverables) {
          for (let i = 0; i < deliverables.length; i++) {
            deliverableIds.push(deliverables[i]._id);
          }
          return deliverables;
        } else {
          throw `No deliverables found under ${course.courseId} with markInBatch set as true.`;
        }
      })
      .catch(err => {
        logger.error(`TeamController::getDeliverables() ERROR ${err}`);
      });
  }

  // Gets CourseSettings to see if markByBatch flag enabled, and then gets Deliverable(s)
  // based markByBatch flag.
  function getDeliverable(deliverableName: string, course: ICourseDocument) {
    return Deliverable.findOne({name: deliverableName, courseId: course._id}).exec()
      .then((deliverable: IDeliverableDocument) => {
        if (deliverable) {
          return deliverable;
        }
        throw `Team.Controller::getDeliverable(${deliverableName}, ${course._id})
           No Deliverable Found`;
      });
  }

  function filterUsersAlreadyInTeam(teams: ITeamDocument[]) {
    let allTeamMembers: any = new Array();
    // compile all Team members on Teams to filter out in next method
    for (let i = 0; i < teams.length; i++) {
      teams[i].members.map((delivId: IUserDocument) => {
        allTeamMembers.push(delivId);
      });
    }

    let filteredList = course.classList.filter((userInClassId: string) => {
      let existsOnTeam: boolean = false;
      let userInClassString = userInClassId.toString();

      for (let i = 0; i < allTeamMembers.length; i++) {
        let userAlreadyOnTeam = allTeamMembers[i].toString();

        if (userInClassString.indexOf(userAlreadyOnTeam) > -1) {
          existsOnTeam = true;
        }
      }
      // we only get the users that do not exist on a team.
      return !existsOnTeam;
    });
    return filteredList;
  }

  function splitUsersIntoArrays(usersList: any): Object[] {
    let sorted: any = {teams: new Array()};
    try {

      // divides number of teams needed and rounds up
      let teamSize = typeof payload.teamSize === 'undefined' ? course.maxTeamSize : payload.teamSize;
      const numberOfTeams = Math.ceil(usersList.length / teamSize);
      // creates arrays for each Team
      for (let i = 0; i < numberOfTeams; i++) {
        sorted.teams.push(new Array());
      }

      let maxTeamSize = course.maxTeamSize;
      let teamNumber = 0;

      for (let i = 0; i < usersList.length; i++) {
        sorted.teams[teamNumber].push(usersList[i]);
        teamNumber++;
        if (teamNumber % numberOfTeams == 0) {
          teamNumber = 0;
        }
      }
      return sorted.teams;
    }
    catch (err) {
      logger.error(`TeamController::splitUsersIntoArrays() ERROR ${err}`);
    }
    return sorted.teams;
  }
}

function randomlyGenerateTeamsPerLab() {

}

function checkForDuplicateTeamMembers(existingTeams: ITeamDocument[], newTeamMembers: [Object]) {
  let duplicateEntry: boolean;
  let duplicatedMember: boolean;
  let userCompiliation = new Array();
  // Push each team member into an array to cross-check that member is not added
  // to more than one Team per Deliverable.
  for (let team in existingTeams) {
    for (let i = 0; i < existingTeams[team].members.length; i++) {
      userCompiliation.push(existingTeams[team].members[i]);
    }
  }

  for (let i = 0; i < userCompiliation.length; i++) {
    duplicateEntry = newTeamMembers.some(function (member: IUserDocument) {
      return userCompiliation[i] == member;
    });
    if (duplicateEntry) {
      duplicatedMember = true;
    }
  }
  return duplicatedMember;
}

// let createTeam = function(course_Id: any, req: any) {
//   let newTeam = {
//     'course' : course_Id,
//     'deliverable': req.params.deliverable,
//     'members': new Array(),
//     'name': req.params.name,
//     'teamId': req.params.teamId,
//     'githubUrl': req.params.githubUrl,
//   };

//   // Only add non-duplicates
//   for ( let i = 0; i < req.params.members.length; i++) {
//     let duplicateEntry = newTeam.members.some(function(member){
//       return member == req.params.members[i];
//     });
//     if (!duplicateEntry) {
//       newTeam.members.push(req.params.members[i]);
//     }
//   }

//   return Team.create(newTeam);
// };

let updateTeam = function (team_Id: string, updatedModel: ITeamDocument) {

  if (updatedModel.members == null || updatedModel.TAs == null) {
    return Promise.reject(Error('Payload objects malformed. Cannot update team.'));
  }

  return Team.findOne({'_id': team_Id})
    .exec()
    .then(t => {
      if (t === null) {
        return Promise.reject(Error('Team ID ' + team_Id + ' not found.'));
      }
      t.set('members', []);
      t.set('TAs', []);
      t.githubState.repo.url = updatedModel.githubState.repo.url;

      // Only add non-duplicates
      for (let i = 0; i < updatedModel.members.length; i++) {
        let duplicateEntry = t.members.some(function (member) {
          return member == updatedModel.members[i];
        });
        if (!duplicateEntry) {
          t.members.push(updatedModel.members[i]);
        }
      }
      t.name = updatedModel.name;

      // Only add non-duplicates
      for (let i = 0; i < updatedModel.TAs.length; i++) {
        let duplicateEntry = t.TAs.some(function (TA) {
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

  if (teamSize !== null && teamSize > 0) {
    return Course.findOne({'_id': courseObjectId})
      .exec()
      .then(c => {
        minTeamSize = c.minTeamSize;
        maxTeamSize = c.maxTeamSize;
      })
      .then((c) => {
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

  let getTeamsUnderDeliverable = Team.find({'deliverable': deliverable, '_id': {$nin: teamId}})
    .populate('deliverable')
    .exec()
    .then(existingTeams => {
      if (existingTeams !== null) {
        return Promise.resolve(checkForDuplicateTeamMembers(existingTeams, newTeamMembers));
      } else {
        return Promise.reject(Error('Unable to find team with deliverable ' + deliverable + ' in payload.'));
      }
    });

  return getTeamsUnderDeliverable
    .then(results => {
      if (results !== null) {
        return updateTeam(teamId, updatedModel);
      }
      return Promise.reject(Error('Cannot add duplicate team members to deliverable.'));
    });
}

function insertTeamDocuments(_bulkInsertArray: any) {
  return Team.collection.insertMany(_bulkInsertArray)
    .then((documents: any) => {
      return documents;
    })
    .catch(err => {
      logger.error(`TeamController::bulkInsertOp ERROR ${err}`);
    });
}
// One student per deliverable --> Maps to these conditions:
// 1) Students must be unique on the team.
// 2) Amongst the teams that exist with a particular Deliverable ID,
//    students must also be unique.
// ---> These conditions ensure that students cannot be on multiple teams
//      per deliverable.
// 3) If no teams with deliverableId found, create new team.

// function add(req: any) {
//   let courseId = req.params.courseId;
//   let deliverable = req.params.deliverable;
//   let newTeamMembers = req.params.members;
//   let name = req.params.name;
//   let githubUrl = req.params.githubUrl;
//   let teamId = req.params.teamId;
//   let teamSize: number;


//   let getTeamsUnderDeliverable = Team.find({ 'deliverable' : deliverable })
//     .populate('deliverable')
//     .exec()
//     .then( existingTeams => {
//       return checkForDuplicateTeamMembers(existingTeams, newTeamMembers);
//     })
//     .catch(err => logger.info(err));

//   let courseQuery = getTeamsUnderDeliverable.then( duplicateMembers => {
//       return Course.findOne({ 'courseId' : courseId })
//         .exec();
//   })
//   .catch(err => logger.info(err));

//   return Promise.all([getTeamsUnderDeliverable, courseQuery])
//     .then(function(results: any) {
//       if (results[0] !== true) {
//         return isWithinTeamSize(results[1]._id, req.params.members.length)
//           .then( () => {
//             return createTeam(results[1]._id, req);
//           });
//       }
//       throw Error('Cannot add duplicate team members to deliverable.');
//     });
// }

export {
  createTeam, update, getTeams, createGithubTeam, createGithubRepo, getRepos, getCourseTeamsPerUser,
  randomlyGenerateTeamsPerCourse, getUsersNotOnTeam, getMyTeams, createCustomTeam,
  getCourseTeamsWithBatchMarking
};
