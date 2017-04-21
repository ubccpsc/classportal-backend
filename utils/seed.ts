import { logger } from '../utils/logger';
import { User, IUserDocument } from '../app/models/user.model';
import { config } from '../config/env';
import { app } from '../config/restify';
import * as server from '../server';


const data = {

  users: [
    { 'csid' : 'a1a1', 'snum' : '1', 'lname' : 'Alast', 'fname' : 'Afirst',
      'username' : 'rodney', 'courses' : new Array(), 'teamUrl' : '' },
    { 'csid' : 'b2b1', 'snum' : '2', 'lname' : 'Blast', 'fname' : 'Bfirst',
      'username' : 'bodney', 'courses' : new Array(), 'teamUrl' : '' },
    { 'csid' : 'c3c1', 'snum' : '3', 'lname' : 'Clast', 'fname' : 'Cfirst',
      'username' : 'codney', 'courses' : new Array(), 'teamUrl' : '' },
    { 'csid' : 'e5e5', 'snum' : '5', 'lname' : 'Elast', 'fname' : 'Efirst',
      'username' : 'eodney', 'courses' : new Array(), 'teamUrl' : ''},
    { 'csid' : '12312321', 'snum' : '5', 'lname' : 'Smith', 'fname' : 'Thomas',
      'username' : 'thekitsch', 'courses' : new Array() },
  ],

  courses: [
    { 'courseId' : '710', 'minTeamSize' : 41, 'maxTeamSize' : 1023, 'customData' : '{}',
      'studentsSetTeams' : true, 'admins' : [['fred', 'jimmy']], 'grades' : new Array(),
      'deliverables' : new Array(), 'classList' : new Array(), 'modules' : new Array(),
      'icon' : '//cdn.ubc.ca/clf/7.0.5/img/favicon.ico', 'name' : '' },
  ],
};

server.onConnect.then( connection => {
  return seedData();
});

function seedData(): Promise<IUserDocument[]> {
  logger.info('Verifying that users exist in db:');

  if (data.users.length < 1) {
    return Promise.reject(new Error('Error: No users specified in data.users!'));
  } else {
    // get users
    let usersArray = data.users;
    logger.info(usersArray.map((user: any) => user.fname));

    // write all users to db
    const promises: Promise<IUserDocument>[] = usersArray.map((current: any) => {
      const newUser: IUserDocument = new User({
        username: current.username,
        lname: current.lname,
        fname: current.fname,
        csid: current.csid,
        snum: current.snum,
        courses: current.courses,
        teamUrl: current.teamUrl,
      });
      return newUser
        .save();
    });

    return Promise.all(promises);
  }
}

export { seedData };