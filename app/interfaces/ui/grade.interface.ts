export interface GradePayloadContainer {
  response: GradeRow[];
}

export interface GradeRow {
  userName: string; // cwl
  commitUrl: string; // full URL to commit corresponding to the row
  delivKey: string; // deliverable name (e.g., d0)
  delivValue: string; // score for deliverable key (use string rep for flexibility)
  projectUrl: string; // full URL to project
  projectName: string; // string name for project (e.g., cpsc310_team22)
  sNum: string; // may be removed in future
  fName: string; // may be removed in future
  lName: string; // may be removed in future
  timeStamp: number;
  labId: string;
  delivDetails: GradeDetail[];
}

/**
* This is for extra detail about grades. E.g., if we wanted to return the test and cover score components as well.
* Will probably be useful for future grade extensions.
*/
export interface GradeDetail {
  key: string;
  value: string;
}