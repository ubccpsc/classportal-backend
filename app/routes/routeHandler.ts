import * as restify from 'restify';
import * as userCtrl from '../controllers/user.controller';
import * as courseCtrl from '../controllers/course.controller';
import * as authCtrl from '../controllers/auth.controller';
import * as delivCtrl from '../controllers/deliverable.controller';
import * as gradeCtrl from '../controllers/grade.controller';
import * as teamCtrl from '../controllers/team.controller';
import * as testCtrl from '../controllers/test.controller';
import * as fileCtrl from '../controllers/file.controller';
import * as githubCtrl from '../controllers/github.controller';
import * as dockerCtrl from '../controllers/docker.controller';
import {TeamPayloadContainer, TeamPayload, TeamRow, Student} from '../interfaces/ui/team.interface';
import {logger} from '../../utils/logger';
import {ContainerInfo} from '../controllers/deliverable.controller';
import {Course, ICourseDocument, StudentWithLab} from '../models/course.model';
import {Grade, IGradeDocument} from '../models/grade.model';
import {User, IUserDocument} from '../models/user.model';
import {Project, IProjectDocument} from '../models/project.model';
import {Deliverable, IDeliverableDocument} from '../models/deliverable.model';
import {Team, ITeamDocument} from '../models/team.model';
import {Dashboard} from "../controllers/dashboard.controller";
import {Results} from "../controllers/result.controller";

let mime = require('mime-types');

const pong = (req: restify.Request, res: restify.Response) => res.send('pong');

const createCourse = (req: restify.Request, res: restify.Response) => {
  return courseCtrl.create(req.params)
    .then(() => res.json(200, {response: 'Successfully added Course #' + req.params.courseId}))
    .catch((err: Error) => res.json(500, {'err': err.message}));
};

const getAllCourses = (req: restify.Request, res: restify.Response) => {
  return courseCtrl.getAllCourses(req.params)
    .then((courseList) => res.json(200, {response: courseList}))
    .catch((err: Error) => res.json(500, {'err': err.message}));
};

const getMyCourses = (req: restify.Request, res: restify.Response) => {
  return courseCtrl.getMyCourses(req)
    .then((courseList) => res.json(200, {response: courseList}))
    .catch((err: Error) => res.json(500, {'err': err.message}));
};

const getLabSectionsFromCourse = (req: restify.Request, res: restify.Response) => {
  return courseCtrl.getLabSectionsFromCourse(req)
    .then((courseList) => res.json(200, {response: courseList}))
    .catch((err: Error) => res.json(500, {'err': err.message}));
};

const getCourseLabSectionList = (req: restify.Request, res: restify.Response) => {
  return courseCtrl.getCourseLabSectionList(req)
    .then((courseList) => res.json(200, {response: courseList}))
    .catch((err: Error) => res.json(500, {'err': err.message}));
};

const updateClassList = (req: restify.Request, res: restify.Response) => {
  return courseCtrl.updateClassList(req.files, req.params.courseId)
    .then((c: StudentWithLab[]) => res.json(200, {response: c}))
    .catch((err: Error) => res.json(500, {'err': err.message}));
};

const getClassList = (req: restify.Request, res: restify.Response) => {
  return courseCtrl.getClassList(req.params.courseId)
    .then((classListWithLab) => res.json(200, {response: classListWithLab}))
    .catch((err: Error) => res.json(500, {err: err.message}));
};

const getStudentNamesFromCourse = (req: restify.Request, res: restify.Response) => {
  return courseCtrl.getStudentNamesFromCourse(req.params.courseId)
    .then((classList) => res.json(200, {response: classList}))
    .catch((err: Error) => res.json(500, {err: err.message}));
};

const logout = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return authCtrl.logout(req, res, next)
    .then(() => res.json(200, {response: 'Successfully logged out.'}))
    .catch((err: any) => res.json(500, {err: err.errmsg}));
};

const getCurrentUserInfo = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return testCtrl.getCurrentUserInfo(req, res, next)
    .catch((err: any) => {
      res.json(500, {err: err.errmsg});
    });
};

const oauthCallback = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return authCtrl.oauthCallback(req, res, next)
    .then(() => res.json(200, {response: 'Successfully authenticated user.'}))
    .catch((err: any) => res.json(500, {err: err.errmsg}));
};

const updateDeliverable = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return delivCtrl.updateDeliverable(req.params)
    .then((updatedDeliv: IDeliverableDocument) => res.json(200, {response: updatedDeliv}))
    .catch((err: any) => res.json(500, {err: err}));
};

const getContainerInfo = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return delivCtrl.getContainerInfo(req.params)
    .then((containerInfo: ContainerInfo) => res.json(200, {response: containerInfo}))
    .catch((err: any) => res.json(500, {err: err}));
};

const addDeliverable = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return delivCtrl.addDeliverable(req.params)
    .then((newDeliv: IDeliverableDocument) => res.json(200, {response: newDeliv}))
    .catch((err: any) => res.json(500, {err: err}));
};

const getDeliverables = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return delivCtrl.getDeliverablesByCourse(req.params)
    .then((deliverables) => res.json(200, {response: deliverables}))
    .catch((err: any) => res.json(500, {err: err}));
};

const getAllGrades = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return gradeCtrl.getAllGrades(req.params)
    .then((grades: IGradeDocument[]) => res.json(200, {response: grades}))
    .catch((err: any) => res.json(500, {err: err}));
};

const getGradesByDeliv = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return gradeCtrl.getGradesByDeliv(req.params)
    .then((grades: IGradeDocument[]) => res.json(200, {response: grades}))
    .catch((err: any) => res.json(500, {err: err}));
};

const getGradesIfReleased = (req: any, res: restify.Response, next: restify.Next) => {
  return gradeCtrl.getGradesIfReleased(req.params, req.user.snum, req.user.csid)
    .then((grades: any) => res.json(200, {response: grades}))
    .catch((err: any) => res.json(500, {err: err}));
};

const createTeam = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.createTeam(req)
    .then((team: ITeamDocument) => res.json(200, {response: `Successfully added new team ${team.githubOrg}`}))
    .catch((err: any) => {
      logger.info(err);
      res.json(500, {'err': err.message});
    });
};

const updateTeam = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.update(req)
    .then(() => res.json(200, {response: 'Successfully updated team.'}))
    .catch((err: any) => {
      logger.info(err);
      console.log('routeHandler error: ' + err);
      res.json(500, {'err': err.message});
    });
};

const addAdminList = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return courseCtrl.addAdminList(req.files, req.params.courseId)
    .then((courseAdminList: any) => res.json(200, {
      response: courseAdminList
    }))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getAllAdmins = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return courseCtrl.getAllAdmins(req.params)
    .then((course: ICourseDocument) => res.json(200, {response: course.admins}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getTeams = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.getTeams(req.params)
    .then((teamList: ITeamDocument[]) => res.json(200, {response: teamList}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const addGradesCSV = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return gradeCtrl.addGradesCSV(req)
    .then((updatedGrades: any) => res.json(200, {response: updatedGrades}))
    .catch((err: any) => res.json(500, {err: err}));
};

const createGithubTeam = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return githubCtrl.createGithubTeam(req.params)
    .then((githubResponse: Object) => res.json(200, {response: 'Successfully created team with members.'}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const createGithubReposForTeams = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return githubCtrl.createGithubReposForTeams(req.params)
    .then((githubResponse: Object) => res.json(200, {response: 'Successfully created repo with teams and members.'}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getRepos = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return githubCtrl.getRepos(req.params.orgName)
    .then((reposList: [Object]) => res.json(200, {response: reposList}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const deleteRepos = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return githubCtrl.deleteRepos(req.params)
    .then((reposList: [Object]) => res.json(200, {response: reposList}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getCurrentUser = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return authCtrl.getCurrentUser(req, res, next)
    .then((currentUser: object) => res.json(200, {response: currentUser}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const isAuthenticated = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return authCtrl.isAuthenticated(req, res, next)
    .then((authStatus: boolean) => res.json(200, {response: authStatus}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getCourseSettings = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return courseCtrl.getCourseSettings(req)
    .then((courseSettings: Object) => res.json(200, {response: courseSettings}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getCourseTeamsPerUser = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.getCourseTeamsPerUser(req)
    .then((teams: ITeamDocument[]) => res.json(200, {response: teams}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const randomlyGenerateTeamsPerCourse = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.randomlyGenerateTeamsPerCourse(req.params)
    .then((teams: any) => res.json(200, {response: teams}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getUsersNotOnTeam = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.getUsersNotOnTeam(req.params)
    .then((notOnTeamList: IUserDocument[]) => res.json(200, {response: notOnTeamList}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getCourse = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return courseCtrl.getCourse(req.params)
    .then((course: ICourseDocument) => res.json(200, {response: course}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getMyTeams = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.getMyTeams(req)
    .then((teams: ITeamDocument[]) => res.json(200, {response: teams}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const repairGithubReposForTeams = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return githubCtrl.repairGithubReposForTeams(req.params)
    .then((projects: any) => res.json(200, {response: projects}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const createCustomTeam = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.createCustomTeam(req, req.params)
    .then((projects: any) => res.json(200, {response: projects}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const isStudentInSameLab = (req: any, res: restify.Response, next: restify.Next) => {
  return userCtrl.isStudentInSameLab(req.params, req.user.username)
    .then((enrollmentStatus: object) => res.json(200, {response: enrollmentStatus}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getCourseTeamInfo = (req: any, res: restify.Response, next: restify.Next) => {
  return teamCtrl.getCourseTeamInfo(req.params)
    .then((teamPayload: TeamPayload) => res.json(200, {response: teamPayload}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getDashForDeliverable = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  console.log('routeHandler::getDashForDeliverable() - start');
  const dash = new Dashboard();
  return dash.getDashboard(req, req.params, next)
    .then((rows: any) => res.json(200, {response: rows}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const disbandTeamById = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.disbandTeamById(req.params)
    .then((isSuccessful: any) => res.json(200, {response: isSuccessful}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getTeamProvisionOverview = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return teamCtrl.getTeamProvisionOverview(req.params)
    .then((overview: any) => res.json(200, {response: overview}))
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getGradesFromResults = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return new Results().getResultsByCourse(req.params)
    .then((results) => {
      const CSV_FORMAT_FLAG = 'csv';
      if (req.params.format === CSV_FORMAT_FLAG) {
        res.writeHead(200, {
          'Content-Type':        'text/csv',
          'Content-Disposition': 'attachment; filename=Course' + req.params.courseId + 'Grades.csv',
        });
        res.end(results);
      }
      res.json(200, {response: results});
    })
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getFileFromResultRecord = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  const FILENAME = req.params.filename;
  return fileCtrl.getFileFromResultRecord(req.params)
    .then((response: any) => {
      res.writeHead(200, {
        'Content-Type':        mime.lookup(FILENAME),
        'Content-Disposition': 'inline; filename=' + FILENAME,
      });
      res.end(response);
    })
    .catch((err: any) => res.json(500, {err: err.message}));
};

const getStdioFile = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  const STDIO_REF: string = req.params.stdioRef;
  return fileCtrl.getStdioRecord(STDIO_REF)
    .then((response: any) => {
      res.writeHead(200, {
        'Content-Type':        mime.lookup('stdio.txt'),
        'Content-Disposition': 'inline; filename=stdio.txt'
      });
      res.end(response);
    })
    .catch((err: any) => res.json(500, {err: err.message}));
};

const isStaffOrAdmin = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return courseCtrl.isStaffOrAdmin(req.params)
    .then((isStaff: any) => res.json(200, {response: isStaff}))
    .catch((err: any) => res.json(500, {err: err}));
};

const addStaffList = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return courseCtrl.addStaffList(req.files, req.params.courseId)
    .then((isStaff: any) => res.json(200, {response: isStaff}))
    .catch((err: any) => res.json(500, {err: err}));
};

const getAllStaff = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return courseCtrl.getAllStaff(req.params)
    .then((isStaff: any) => res.json(200, {response: isStaff}))
    .catch((err: any) => res.json(500, {err: err}));
};

const getTestDelay = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return delivCtrl.getTestDelay(req.params)
    .then((isStaff: any) => res.json(200, {response: isStaff}))
    .catch((err: any) => res.json(500, {err: err}));
};

const getDefaultDeliv = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return delivCtrl.getDefaultDeliv(req.params)
    .then((defaultDeliv: any) => res.json(200, {response: defaultDeliv}))
    .catch((err: any) => res.json(500, {err: err}));
};

const removeRepoFromTeams = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return githubCtrl.removeReposFromTeams(req.params)
    .then((defaultDeliv: any) => res.json(200, {response: defaultDeliv}))
    .catch((err: any) => res.json(500, {err: err}));
};

const raiseContainer = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return dockerCtrl.raiseContainer(req.params)
    .then((defaultDeliv: any) => res.json(200, {response: defaultDeliv}))
    .catch((err: any) => res.json(500, {err: err}));
};

const dropContainer = (req: restify.Request, res: restify.Response, next: restify.Next) => {
  return dockerCtrl.dropContainer(req.params)
    .then((defaultDeliv: any) => res.json(200, {response: defaultDeliv}))
    .catch((err: any) => res.json(500, {err: err}));
};

const testJwt = (req: restify.Request, res: any, next: restify.Next) => {
  res.setCookie('thiscookie', 'testS', {path: '/', maxAge: 60, secure: true});
  return res.json(200, {response: 'response'});
};

export {
  pong, createCourse, getAllCourses, logout, updateClassList, getClassList,
  getCurrentUserInfo, updateDeliverable, getDeliverables, isStaffOrAdmin,
  getAllGrades, createTeam, updateTeam, getStudentNamesFromCourse,
  addAdminList, getAllAdmins, getTeams, addGradesCSV, createGithubTeam, createGithubReposForTeams, getRepos,
  deleteRepos, getCurrentUser, isAuthenticated, getMyCourses,
  getCourseSettings, getCourseTeamsPerUser, getLabSectionsFromCourse, getCourseLabSectionList,
  addDeliverable, randomlyGenerateTeamsPerCourse, getTestDelay, getContainerInfo,
  getUsersNotOnTeam, getCourse, getMyTeams, repairGithubReposForTeams,
  createCustomTeam, isStudentInSameLab, getCourseTeamInfo, getDashForDeliverable,
  disbandTeamById, getGradesFromResults, getFileFromResultRecord, getTeamProvisionOverview,
  getStdioFile, addStaffList, getAllStaff, getDefaultDeliv, removeRepoFromTeams, testJwt,
  getGradesByDeliv, getGradesIfReleased, raiseContainer, dropContainer,
};
