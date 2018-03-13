import {LabSection} from '../../models/course.model';
import {IUserDocument} from '../../models/user.model';

export interface CourseInterface {
  courseId: string; // number of a Course in string format
  dockerRepo: string; // repo that Course image is built from
  dockerKey: string; // long github personal access token string
  labSections: LabSection[]; // All students grouped into Labs
  githubOrg: string; // The github organization that is being used this semester
  delivKey: string;
  whitelistedServers: string; // space seperated list of servers and ports ie. 'serverDNS.com:port'
  solutionsKey: string;
  admins: IUserDocument[];
  dockerLogs: object; // UI should not touch.
  buildingContainer: boolean; // true when Docker image is being built.
  staffList: IUserDocument[];
  urlWebhook: string;
}

