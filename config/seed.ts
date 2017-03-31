import { logger } from '../utils/logger';
import { User, IUserDocument } from '../app/models/user.model';

const data = {
  users: [
    {
      username: 'rtholmes',
      firstname: 'Reid',
      lastname: 'Holmes',
      csid: 'a1111111',
      snum: '111111111',
      prof: true,
    },
    {
      username: 'mksarge',
      firstname: 'Michael',
      lastname: 'Sargent',
      csid: 'b2222222',
      snum: '222222222',
      prof: false,
    },
    {
      username: 'andrewstec',
      firstname: 'Andrew',
      lastname: 'Stec',
      csid: 'c3333333',
      snum: '333333333',
      prof: false,
    },
  ],
};

function seedData(): Promise<IUserDocument[]> {
  logger.info('Verifying that users exist in db:');

  if (data.users.length < 1) {
    return Promise.reject(new Error('Error: No users specified in data.users!'));
  } else {
    // get users
    let usersArray = data.users;
    logger.info(usersArray.map((user: any) => user.firstname));

    // write all users to db
    const promises: Promise<IUserDocument>[] = usersArray.map((current: any) => {
      const newUser: IUserDocument = new User({
        username: current.username,
        lastname: current.lastname,
        firstname: current.firstname,
        csid: current.csid,
        snum: current.snum,
        prof: current.prof,
      });
      return newUser
        .save()
        .then((savedUser: IUserDocument) => {
          return savedUser;
        });
    });

    return Promise.all(promises);
  }
}

export { seedData };
