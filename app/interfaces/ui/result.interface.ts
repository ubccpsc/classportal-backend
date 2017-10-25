export interface ResultPayloadContainer {
  response: ResultPayload;
}

// export interface ResultPayload {
//  students: Student[]; // _all_ students in the course, whether they invoked AutoTest or not
//  records: ResultRecord[]; // all records within the valid time range. Single deliverable only (v0 at least).
// }

export interface ResultPayloadInternal {
  students: StudentResult[];
  records: ResultRecord[];
}

export interface ResultPayload {
  students: StudentResult[];
  // records: ResultRecord[];

  // TODO: remove records
  // TODO: update students to studentresult

  // Maps the projects to the result records
  // Enables quick retrieval of ResultRecord from a StudentRecord
  projectMap: { [projectUrl: string]: ResultRecord[] };
}

export interface StudentResult extends Student {
  projectUrl: string; // the project for a student (deliverableId captured in ResultRecord itself)
}

export interface ResultRecord {
  userName: string;           // cwl; key back to Student
  timeStamp: number;          // timestamp of the webhoook push event

  projectName: string;        // string name for project (e.g., cpsc310_team22)
  projectUrl: string;         // full URL to project

  commitUrl: string;          // full URL to commit corresponding to the row
  branchName: string;         // branch name
  gradeRequested: boolean;    // was the result explicitly requested by the student

  delivId: string;            // deliverable name
  grade: string;              // string, just in case people want to use letters instead of numbers
  gradeDetails: ResultDetail[];
}

/**
 * This is for extra detail about an execution result.
 *
 * AutoTest containers will be able to add this detail to the execution result so
 * it can be available during conversion into Grade records.
 *
 * value is a string, just to keep things simple (aka to avoid huge objects being
 * appended, and to allow for both '98' and 'A+' as needed.
 *
 * For example:
 *
 * {key: 'testScore', value: '92'}
 * {key: 'branchCoverage', value: '65'}
 *
 */
export interface ResultDetail {
  key: string;
  value: string;
}


/**
 * Standard student object.
 */
export interface Student {
  userName: string;           // CWL: Primary Key for object
  userUrl: string;            // full URL to user

  fName: string;
  lName: string;

  sNum: string;
  csId: string;

  labId: string;
  TA: string[];               // TAs who have tagged team. For future. Just return [] for now.
}
