import * as restify from 'restify';
import {logger} from '../../utils/logger';
import {ITeamDocument, Team} from '../models/team.model';
import {ICourseDocument, Course, LabSection} from '../models/course.model';
import {IUserDocument, User} from '../models/user.model';
import {IDeliverableDocument, Deliverable} from '../models/deliverable.model';
import MongoClient from '../db/MongoDBClient';
import {GithubState, GithubRepo, defaultGithubState} from '../models/github.interfaces';
import GitHubManager from '../github/githubManager';
import {TeamPayloadContainer, TeamPayload, TeamRow, Student} from '../interfaces/ui/team.interface';
import * as auth from '../middleware/auth.middleware';
import {ProvisionHealthCheck, StudentTeamStatusContainer} from '../interfaces/ui/healthCheck.interface';

const TEAM_PREPENDAGE = 'team';

// One problem with this just being functions like this instead of having them in a class
// is that we can't distinguish between the public interface and the private interface.

export class ITeamError {
  public status: string;
  public message: string;
}

export class ITeamTuple {
  public userName: string;
  public team: ITeamDocument;
}


export class TeamController {

  private _orgName: string;
  private _courseId: string;

  constructor(orgName: string, courseId: string) {
    this._orgName = orgName;
    this._courseId = courseId;
  }

  /**
   * Find the team information for a user in a course. We return the ITeamTuple here
   * so we can still track the 'no teams' case for a user within promises (e.g., if
   * we returned null, and were using this within Promise.all, we wouldn't know who
   * the null was for.
   *
   * @param courseId
   * @param userName
   * @returns {Promise<ITeamTuple | ITeamError>}
   */
  public getUserTeam(userName: string): Promise<ITeamTuple | ITeamError> {
    return this.queryUserTeam(userName).then(function (team) {
      if (team !== null) {
        return Promise.resolve(team);
      } else {
        throw new Error(`You are not on any teams under ${this._courseId}.`);
      }
    }).catch(function (err: Error) {
      logger.error('TeamController::getUserTeam() - ERROR: ' + err.message);
      return Promise.reject({status: 'error', message: err.message});
    });
  }

  /**
   * Gets all the teams for a given course.
   *
   * @param courseId
   * @returns {Promise<ITeamDocument[] | ITeamError>} If there are no teams, return [].
   */
  public getAllTeams(): Promise<ITeamDocument[] | ITeamError> {
    return this.queryAllTeams().then(function (teams) {
      return Promise.resolve(teams);
    }).catch(function (err: Error) {
      logger.error('TeamController::getAllTeams() - ERROR: ' + err.message);
      return Promise.reject({status: 'error', message: err.message});
    });
  }

  /**
   * Creates a team for a given set of users. If isAdmin is true, some basic safeguards
   * are overridden (e.g., team sizes), but some are honoured for all users (e.g.,
   * if a user is on a team they cannot be put on another team).
   *
   * NOTE: This is missing the deliv aspect.
   * We need to think a bit harder about how tying teams to multiple deliverables works.
   *
   * @param courseId
   * @param userNames
   * @param isAdmin
   * @returns {{status: string, message: string}}
   */
  public createTeam(userNames: string[], isAdmin: boolean): Promise<ITeamDocument | ITeamError> {

    let userPromises = [];
    for (let userName of userNames) {
      userPromises.push(this.getUserTeam(userName));
    }

    return Promise.all(userPromises).then(function (userTeams: ITeamTuple[]) {
      let users = [];
      let alreadyOnTeam = [];

      for (let userTeam of userTeams) {
        if (userTeam.team === null) {
          users.push(userTeam.userName);
        } else {
          alreadyOnTeam.push(userTeam.userName);
        }
      }

      // even admins can't put someone on a team who is already teamed up
      if (alreadyOnTeam.length > 0) {
        throw new Error('Some user(s) are already on teams: ' + JSON.stringify(alreadyOnTeam));
      }

      if (isAdmin === true) {
        // ignore safeguards
      } else {
        const MIN_MEMBERS = 1; // should come from somewhere
        const MAX_MEMBERS = 1; // should come from somewhere

        if (users.length < MIN_MEMBERS) {
          throw new Error('Insufficient members specified');
        }

        if (users.length > MAX_MEMBERS) {
          throw new Error('Too many members specified');
        }
      }

      return this.queryCreateTeam(users).then(function (team: ITeamDocument) {
        if (team !== null) {
          return Promise.resolve(team);
        } else {
          logger.error('TeamController::createTeam() - team formation failed');
          // not a very useful message; does this ever happen?
          throw new Error('Team formation failed.');
        }
      });

    }).catch(function (err: Error) {
      logger.error('TeamController::createTeam() - ERROR: ' + err.message);
      return Promise.reject({status: 'error', message: err.message});
    });
  }

  /**
   *
   * @param userName
   * @returns {ITeamDocument | null} the user's ITeamDocument for that course (if it exists) or null.
   */
  private queryUserTeam(userName: string): Promise<ITeamTuple> {
    // also use this._orgName, this._courseId
    let ret: ITeamTuple = {userName, team: null}; // 'userName: userName' causes lint error
    return Promise.resolve(ret);
  }

  /**
   *
   * @param courseId
   * @returns {ITeamDocument} if no teams returns []
   */
  private queryAllTeams(): Promise<ITeamDocument[]> {
    // also use this._orgName, this._courseId
    return Promise.resolve([]); // TODO: implement
  }

  /**
   *
   * @param courseId
   * @param users
   * @returns {ITeamDocument} the created team document
   */
  private queryCreateTeam(users: string[]): Promise<ITeamDocument | null> {
    // also use this._orgName, this._courseId
    return Promise.resolve(null); // TODO: implement
  }

}

  /**
   * @param req.params.courseId course number to find teams in ie. 310
   * @param req.user.username The user is automatically embedded in the request header thanks to Passport
   * @returns {MyTeams[]} *interface available in ClassPortal-UI-Next
   */
function getMyTeams(req: any): Promise<ITeamDocument[]> {

  // params from req
  let userName = req.user.username;
  let courseId = req.params.courseId;

  let user: IUserDocument;
  let course: ICourseDocument;
  return User.findOne({username: userName})
    .then((_user: IUserDocument) => {
      if (_user) {
        user = _user;
        return _user;
      }
      throw `Could not find user ${userName}`;
    })
    .then((_user: IUserDocument) => {
      return Course.findOne({courseId: courseId})
        .then((_course: ICourseDocument) => {
          if (_course) {
            course = _course;
            return _course;
          }
          throw `Could not find course ${courseId}`;
        })
        .catch(err => {
          logger.error(`TeamController::getMyTeams() ERROR ${err}`);
        });
    })
    .then(() => {
      return Team.find({courseId: course._id, members: user._id, 
          $where: 'this.deliverableIds.length > 0 && this.disbanded !== true'})
        .populate({
          path:   'members deliverableIds deliverableId',
          select: 'username fname lname _id name url gradesReleased studentsMakeTeams open close',
        })
        .then((teams: ITeamDocument[]) => {
          if (teams) {
            return teams;
          }
          else {
            throw `You are not on any teams under ${courseId}.`;
          }
        });
    });
}

/**
 * 
 * @param payload.courseId string ie. '310'
 * @param payload.deliverable.name
 */
function getUsersNotOnTeam(payload: any) {

  let course: ICourseDocument;

  return Course.findOne({courseId: payload.courseId})
    .then((_course: ICourseDocument) => {
      course = _course;
      return _course;
    })
    .then((course) => {

      let teamQuery: any = {courseId: course._id};

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
          newTeam.deliverableIds = [];
          newTeam.deliverableIds.push(deliverable._id); 
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

function disbandTeamById(payload: any): Promise<string> {
  return Team.findOne({_id: payload.teamId})
    .then((_team: ITeamDocument) => {
      _team.disbanded = true;
      _team.save();
      return _team;
    })
    .then((_team: ITeamDocument) => {
      if (_team.disbanded === true) {
        return 'Team disbanded.';
      }
      return 'Team could not be disbanded.';
    });
}

/**
 * Creates a TeamPayload object that contains a list of Students without a team
 * and a list of Teams on the basis of a Course and Deliverable.
 * 
 * @param payload.courseId string ie. '310'
 * @param payload.deliverableName string ie. 'd1'
 */
function getCourseTeamInfo(payload: any): Promise<TeamPayload> {

  let courseId = payload.courseId;
  let deliverable: IDeliverableDocument;
  let course: ICourseDocument;
  let courseQuery = Course.findOne({courseId}).exec();
  let teams: ITeamDocument[];

  return courseQuery.then((_course: ICourseDocument) => {
    let teamQueryObject: any = new Object();
    if (_course) {
      course = _course;
      return course;
    }
    else {
      throw `TeamController::getCourseTeamsPerUser Course was not found under Course Number ${courseId}`;
    }
  })
  .then(() => {
    return Deliverable.findOne({courseId: course._id, name: payload.deliverableName})
      .then((deliv: IDeliverableDocument) => {
        if (deliv) {
          deliverable = deliv;
          return deliv;
        }
        throw `Could not find Deliverable under ${payload.courseId} and ${payload.deliverableName}`;
      });
  })
  .then(() => {
    return Team.find({
      courseId: course._id,
      deliverableIds: deliverable._id,
      $where:   'this.disbanded !== true'
    })
      .populate({path: 'members classList', select: 'fname lname username profileUrl'})
      .exec()
      .then((teams: ITeamDocument[]) => {
        if (!teams) {
          return Promise.reject(Error(`TeamController::getCourseTeamsPerUser No teams were found under` +
          `Course Number ${courseId}`));
        }
        for (let team of teams) {
          let githubStateRepoUrl = String(team.githubState.repo.url);
          team.teamUrl = githubStateRepoUrl === '' ? null : githubStateRepoUrl;
        }
        return Promise.resolve(teams);
      })
      .then((_teams: ITeamDocument[]) => {
        if (!_teams) {
          return Promise.reject(Error(`TeamController::getCourseTeamsPerUser No teams were found under
          Course Number ${courseId}`));
        }
        for (let team of _teams) {
          let members = team.members;
          for (let member of members) {
            member.profileUrl = 'https://github.ugrad.cs.ubc.ca/' + member.username;
          }
          for (let labSection of course.labSections) {
            if (typeof members[0] !== 'undefined' && labSection.users.indexOf(members[0]._id) > -1) {
              team.labSection = labSection.labId;
            }
          }
        }
        teams = _teams;
        return Promise.resolve(_teams);
      });
  })
  .then((_teams: ITeamDocument[]) => {
    // get students not on team
    let noTeam: Student[] = [];
    let teams: TeamRow[] = [];
    let payload: TeamPayload = {
      noTeam: [],
      teams: [],
    };
    
    return getStudentsWithoutTeam(course, _teams)
      .then((studentsNotOnTeam: IUserDocument[]) => {

        for (let _student of studentsNotOnTeam) {
          console.log(studentsNotOnTeam);
          let student: Student = {
            fname: '',
            lname: '',
            profileUrl: '',
            username: '',
          };
          student.fname = _student.fname;
          student.lname = _student.lname;
          student.profileUrl = _student.profileUrl;
          student.username = _student.username;
          noTeam.push(student);
        }

        for (let _team of _teams) {
          let team: TeamRow = {
            labSection: '',
            members: [],
            name: '',
            teamUrl: '',
          };
          team.labSection = _team.labSection;
          team.members = _team.members;
          team.name = _team.name;
          team.teamUrl = _team.teamUrl;
          teams.push(team);
        }

        payload.noTeam = noTeam;
        payload.teams = teams;

        return payload;
      });
  });
  
}

/**
 * @param _course <ICourseDocument> Requires course with classList that you want userbase checked against
 * @param _teams <ITeamDocument[]> Requires a list of teams from a class to compile a list of students on teams
 * @return result <Promise<IUserDocument>> list of users without team
 */
function getStudentsWithoutTeam(_course: ICourseDocument, _teams: ITeamDocument[]): Promise<IUserDocument[]> {

  let students: IUserDocument;
  let studentsInClass: IUserDocument[];
  let studentsNotOnTeam: string[] = [];
  let studentsOnTeam: string[] = [];
  let teamPayloadContainer: TeamPayloadContainer[];

  for (let team of _teams) {
    for (let member of team.members) {
      studentsOnTeam.push(String(member._id));
    }
  }

  for (let student of _course.classList) {
    // if student of classList not on a team, then add to studentsNotOnTeam
    let studentInClass: string = String(student);

    if (studentsOnTeam.indexOf(studentInClass) < 0) {
      studentsNotOnTeam.push(studentInClass);
    }
  }

  return User.find({_id: {$in: studentsNotOnTeam}})
    .then((_studentsNotOnTeam: IUserDocument[]) => {
      return _studentsNotOnTeam;
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

/**
 * Creates a TeamHealth state object that shows how many people are on team versus
 * not on a team, have repos built for a team, etc., based on Deliverable and Course
 * 
 * Used by FRONT-END: viewAdmin/ProvisionTeamsDetailsView
 *
 * @param deliverable string ie. "d0", "d1".
 * @param courseId number ie. 210, 310, etc.
 */
function getTeamProvisionOverview(payload: any): Promise<ProvisionHealthCheck> {
  let deliverable: IDeliverableDocument;
  let course: ICourseDocument;
  let teams: ITeamDocument[];
  return Course.findOne({courseId: payload.courseId})
  .then((_course: ICourseDocument) => {
    if (_course) {
      course = _course;
      return _course;
    }
    throw `Could not find course ${payload.courseId}`;
  })
    .then(() => {
      return Deliverable.findOne({courseId: course._id, name: payload.deliverable})
        .then((_deliverable: IDeliverableDocument) => {
          if (_deliverable) {
            deliverable = _deliverable;
            return _deliverable;
          }
          throw `Could not find deliverable ${payload.deliverable}`;
        })
        .catch((err: any) => {
          logger.error(`TeamController::getTeamProvisionOverview() ERROR ${err}`);
          throw "Could not get team provision overview";
        });
    })
    .then(() => {
      // 'or' in query can be deprecated as soon as deliverableIds (pl.) after deliverableId (sing.) is deprecated.
      return Team.find({$or: [{deliverableIds: deliverable._id}, {deliverableId: deliverable._id}]})
        .populate({path: 'courseId', select: 'name courseId'})
        .populate({path: 'members', select: 'fname lname username csid snum _id'})
        .populate({path: 'deliverableIds', select: 'name'})
        .select('-__v -_id -courses')
        .then((_teams: ITeamDocument[]) => {
          if (_teams) {
            teams = _teams;
            return _teams;
          }
          throw 'Could not get team provision overview';
        })
        .catch((err: any) => {
          return err;
        });
    })
    .then(() => {
      return createTeamHealthInfo(course, deliverable, teams);
    });
}

/**
 * Gets information on a deliverable and course to compare against Teams that 
 * are created.
 * @param course ICourseDocument Course with classList info for Teams/Deliverable objects to assess.
 * @param deliverable IDeliverableDocument Deliverable to assess.
 * @param teams ITeamDocument[] List of Teams with Github States for Deliverable and Class.
 * @return healthCheckObj ProvisionHealthCheck 
 */
function createTeamHealthInfo(course: ICourseDocument, deliverable: IDeliverableDocument, 
  teams: ITeamDocument[]): Promise<ProvisionHealthCheck> {
    
    const STUDENTS_MAKE_TEAMS = deliverable.studentsMakeTeams;
    const TEAMS_BY_LAB = deliverable.teamsInSameLab;
    const CLASS_SIZE = course.classList.length;
    let studentsTeamStatus: StudentTeamStatusContainer;
    let buildStats: object;
    let studentsOnTeamIds: object[] = [];
    let studentsWithoutTeamIds: object[] = [];

    let getNumberOfTeams = function() {
      let count = 0;
      for (let team of teams) {
        if (team.disbanded === false) {
          count++;
        }
      }
      return count;
    };

    let getTeamsWithRepo = function() {
      let teamsWithRepo: object[] = [];
      for (let team of teams) {
        if (team.githubState.repo.url !== '') {
          teamsWithRepo.push(team);
        }
      }
      return teamsWithRepo;
    };

    let getTeamsWithoutRepo = function() {
      let teamsWithoutRepo: object[] = [];
      for (let team of teams) {
        if (team.githubState.repo.url === '') {
          teamsWithoutRepo.push(team);
        }
      }
      return teamsWithoutRepo;
    };

    let getStudentsTeamStatus = function() {

      let promises: any = [];            
      for (let student of course.classList) {
        let onTeam: boolean = false;
        for (let team of teams) {
          for (let member of team.members) {
            if (String(member._id) === String(student)) {
              onTeam = true;
            }
          }
        }
        if (onTeam) {
          studentsOnTeamIds.push(student);
        } else {
          studentsWithoutTeamIds.push(student);
        }
      }

      let stuWithQuery = function() {
        return User.find({_id: {$in: studentsOnTeamIds}}, '-__v -_id -courses')
          .exec()
          .then((students: IUserDocument[]) => {
            studentsOnTeamIds = students;
            return students;
          });
      };

      let stuWithoutQuery = function() {
        return User.find({_id: {$in: studentsWithoutTeamIds}}, '-__v -_id -courses')
          .exec()
          .then((students: IUserDocument[]) => {
            studentsWithoutTeamIds = students;
            return students;
          });
      };

      let buildStatsQuery = function() {
        return MongoClient.getDeliverableStats(deliverable.name, course.githubOrg)
          .then((_buildStats: object) => {
            buildStats = _buildStats;
            console.log(_buildStats);
          });
      };

      return Promise.all([stuWithQuery(), stuWithoutQuery(), buildStatsQuery()])
        .then((results: any) => {
          studentsTeamStatus = {studentsWithTeam: studentsOnTeamIds, studentsWithoutTeam: studentsWithoutTeamIds};    
          return studentsTeamStatus;      
        });
    };

    return getStudentsTeamStatus().then(() => {
      let healthCheckObj: ProvisionHealthCheck = { 
        classSize: CLASS_SIZE,
        studentsMakeTeams: STUDENTS_MAKE_TEAMS,
        numOfTeams: getNumberOfTeams(),
        numOfTeamsWithRepo: getTeamsWithRepo(),
        numOfTeamsWithoutRepo: getTeamsWithoutRepo(),
        buildStats: buildStats || null,
        studentTeamStatus: studentsTeamStatus,
        teams: teams,
      };

      return healthCheckObj;
    });

}

  /**
   * Returns all of the raw ITeamDocument[] mongoose documents
   * underneath a courseId.
   * @param courseId string - courseId ie. '310'
   * @return ITeamDocument[] list
   */
function getTeams(payload: any): Promise<ITeamDocument[]> {
  return Course.findOne({courseId: payload.courseId})
    .then(c => {
      return Team.find({courseId: c._id})
        .populate({
          path:   'TAs',
        })
        .populate({
          path:   'deliverableIds',
        })
        .populate({
          path:   'members',
        })
        .then((teams: ITeamDocument[]) => {
          if (teams) {
            return teams;
          }
          throw `Cannot find any teams under course ${payload.courseId}`;
        });
    });
}

/**
 * Creates a custom team for the selected Deliverable with the members in the 'members' array.
 * If any members in the team are already on a team that is not marked with 'disbanded === true', 
 * then the team creation process fails.
 * 
 * *** NOTE *** Front-end confirms that team members are in the same lab before adding them. 
 * This logic does not.
 * 
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
      return validateGithubNames(payload.members, course);
    })
    .then((validTeamMembers: boolean) => {
      if (validTeamMembers) {
        return checkIfMembersOnTeam(payload.members, deliv);
      } else {
        throw `Invalid team member list submitted. At least one user does not exist in database.`;
      }
    })
    .then((membersAlreadyOnTeam: boolean) => {
      if (membersAlreadyOnTeam) {
        throw `Members are already on team. Cannot add team member to multiple teams per 
          deliverable or sets of deliverables`;
      } else if (payload.members.length > deliv.maxTeamSize && user.userrole === STUDENT_ROLE) {
        throw `Cannot have a team larger than ${deliv.maxTeamSize}`;
      } 
      else {
        return createTeamObjects(payload.members);
      }
    })
    .then((newTeamInsertList: any) => {
      return insertTeamDocuments(newTeamInsertList);
    });


  function createTeamObjects(teamIdList: string[]) {

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
          let deliverableIds: any[] = new Array();
          deliverableIds.push(deliv._id);
            let teamObject = {
              courseId:    course._id,
              deliverableIds,
              disbanded: false,
              members:     userIds,
              githubState: defaultGithubState,
            };
            bulkInsertArray.push(teamObject);
        } else {
          throw `Could not find Deliverables for ${payload.deliverableName} and ${course._id}`;
        }

        // adds the team number Name property used by AutoTest
        let counter = deliv.projectCount;
        for (let i = 0; i < bulkInsertArray.length; i++) {
          counter++;
          bulkInsertArray[i].name = TEAM_PREPENDAGE + counter;
        }
        deliv.projectCount = counter;
        deliv.save();
        return bulkInsertArray;
      })
      .catch(err => {
        logger.error(`TeamController::createCustomTeam() createTeamObjectsForBatchMarking() ERROR ${err}`);
      });
  }

  /**
   * Ensures that the teamMembers object contains usernames that are registered underneath the 
   * classList of the Course object.
   * @param course The Course object to test for usernames inside course.classList
   * @param teamMembers List of usernames to search for in course.classList
   * @return boolean Returns true if all teamMembers are valid or false otherwise.
   */
  function validateGithubNames(teamMembers: string[], course: ICourseDocument): boolean {
    logger.info('TeamController:: validateGithubNames() Tentative Team Members:', teamMembers);

    let classList: any = course.classList;
    let validTeamMembers: boolean = true;

    for (let i = 0; i < teamMembers.length; i++) {
      let thisItemIsValid: boolean = false;
      let teamMember: string = teamMembers[i].toString();
      for (let j = 0; j < classList.length; j++) {
        let classListUser = classList[j].username;
        if (teamMember === classListUser) {
          thisItemIsValid = true;
        }
      }
      if (!thisItemIsValid) {
        validTeamMembers = false;
      }
    }
    logger.info('TeamController:: validateGithubNames() Valid Team Members?', validTeamMembers);
    return validTeamMembers;
  }

  /**
   * @param teamMembers array of usernames to test for if they are on a team on a Deliverable
   * @param deliverable the Deliverable object that you want to test against
   * @return boolean Returns true if any teamMemebrs are already on a team to block team formation
   */
  function checkIfMembersOnTeam(teamMembers: string[], deliverable: IDeliverableDocument) {
    logger.info('TeamController:: checkIfMembersOnTeam() for ' + deliverable.name + ':', teamMembers);

    let userIds: string[] = [];

    return User.find({username: teamMembers})
      .then((matches: IUserDocument[]) => {
        if (matches) {
          matches.map((user: IUserDocument) => {
            userIds.push(user._id);
          });
        } else {
          throw `Cannot find the submitted Team Members in the User directory.`;
        }
      })
      .then(() => {
        return Team.find({
          members: {$in: userIds},
          courseId: course.id,
          disbanded: false,
          deliverableIds: deliverable._id
        })
        .then((teams: any[]) => {
          console.log('the teams that match', teams);

          if (teams && teams.length > 0) {
            logger.info('TeamController:: checkIfMembersOnTeam(): ALREADY On Team', teamMembers);
            throw ('TeamController:: checkIfMembersOnTeam(): ALREADY On Team' + JSON.stringify(teamMembers)); 
            // someone is on a team for this delvi in this course
          } else {
            logger.info('TeamController:: checkIfMembersOnTeam() NOT Already On Team', teamMembers);
            return false; // nobody is already on a team for this deliv in this course
          }
        });
      });
  }
}

/**
 * Creates a random team compilations with the number of team members specified. The last team 
 * that is randomly generated may have a lesser number than specified based on the remainder of
 * the division of all team member numbers by the team size requested.
 * 
 * *** IMPORTANT *** This method is used to generate Teams of 1 for Github Repos that only have 
 * one team member. ie. Pcar's '210' class logic.
 * 
 * @param payload.teamSize: The max team size we will create
 * @param payload.inSameLab: boolean: Ensures that team members are in same lab. // UNIMPLEMENTED
 * @param payload.deliverableName: ie. "d1", etc.
 * @param payload.courseId - ie. 310
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
      // checks that user is not already on team with deliverable
      return Team.find({courseId: course.id, deliverableIds: deliverable._id})
        .then((teams: ITeamDocument[]) => {
          let filteredUsers: any = filterUsersAlreadyInTeam(teams);
          return splitUsersIntoArrays(filteredUsers);
        })
        .catch(err => {
          logger.error(`TeamController::getDeliverables() filterByTeams() singleDeliv ERROR ${err}`);
        });
    })
    .then((sortedTeamIdList: string[][]) => {
      return createTeamForEachTeamList(sortedTeamIdList);
    })
    .catch(err => {
      logger.error(`TeamController::randomlyGenerateTeamsPerCourse ERROR ${err}`);
    });

  function createTeamForEachTeamList(sortedTeamIdList: string[][]) {
    let bulkInsertArray: any;
      return createTeamObjects()
        .then((_teams: any) => {
          return insertTeamDocuments(_teams);
        });

    function createTeamObjects() {
      let teams: ITeamDocument[];
      return getDeliverable(payload.deliverableName, course)
        .then((deliv: IDeliverableDocument) => {
          return Team.find({courseId: course._id, deliverableIds: deliv._id})
            .then((_teams: ITeamDocument[]) => {
              teams = _teams;
              return false;
            })
            .then((teamsExist: Boolean) => {
              if (!teamsExist) {
                let bulkInsertArray = new Array();
                if (deliv) {
                  
                  for (let i = 0; i < sortedTeamIdList.length; i++) {
                    let teamObject = {
                      courseId:      course_id,
                      deliverableIds: deliv._id,
                      members:       sortedTeamIdList[i],
                      githubState:   defaultGithubState,
                    };
                    bulkInsertArray.push(teamObject);
                  }
                } else {
                  throw `Could not find Deliverable for ${payload.deliverableName} and ${course._id}`;
                }

                // adds the team number Name property used by AutoTest
                let count: number = deliverable.projectCount;
                for (let i = 0; i < bulkInsertArray.length; i++) {
                  count++;
                  bulkInsertArray[i].name = TEAM_PREPENDAGE + count;
                }
                deliverable.projectCount = count;
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
  }

  function getDeliverable(deliverableName: string, course: ICourseDocument) {
    return Deliverable.findOne({name: deliverableName, courseId: course._id}).exec()
      .then((deliverable: IDeliverableDocument) => {
        if (deliverable) {
          return deliverable;
        }
        throw `Team.Controller::getDeliverable(${deliverableName}, ${course._id}) ` + 
           `No Deliverable Found`;
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
      let teamSize = typeof payload.teamSize === 'undefined' ? deliverable.maxTeamSize : payload.teamSize;
      const numberOfTeams = Math.ceil(usersList.length / teamSize);
      // creates arrays for each Team
      for (let i = 0; i < numberOfTeams; i++) {
        sorted.teams.push(new Array());
      }

      let maxTeamSize = deliverable.maxTeamSize;
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

export {
  createTeam, update, getTeams, createGithubTeam, getRepos, getCourseTeamsPerUser,
  randomlyGenerateTeamsPerCourse, getUsersNotOnTeam, getMyTeams, createCustomTeam,
  getCourseTeamInfo, disbandTeamById, getTeamProvisionOverview
};
