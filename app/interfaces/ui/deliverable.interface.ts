export interface DeliverablePayload {
  _id: string;
  id: string;
  open: number; // timestamp
  close: number; // timestamp
  markInBatch: boolean;
  buildingRepos: boolean;
  gradesReleased: boolean;
  projectCount: number;
  url: string;
  name: string;
}
