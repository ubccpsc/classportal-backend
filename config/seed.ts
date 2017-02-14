import { logger } from '../utils/logger';
import { Admin, IAdminDocument } from '../app/models/admin.model';

const data = {
  admins: [
    {
      username: 'rtholmes',
      firstname: 'Reid',
      lastname: 'Holmes',
      prof: true,
    },
    {
      username: 'mksarge',
      firstname: 'Michael',
      lastname: 'Sargent',
      prof: false,
    },
  ],
};

function seedData(): Promise<IAdminDocument[]> {
  logger.info('Verifying that admins exist in db:');

  if (data.admins.length < 1) {
    return Promise.reject(new Error('Error: No admins specified in config.admins!'));
  } else {
    // get admins
    let adminsArray = data.admins;
    logger.info(adminsArray.map((admin: any) => admin.firstname));

    // write all admins to db
    const promises: Promise<IAdminDocument>[] = adminsArray.map((current: any) => {
      const newAdmin: IAdminDocument = new Admin({
        username: current.username,
        lastname: current.lastname,
        firstname: current.firstname,
        prof: current.prof,
      });
      return newAdmin
        .save()
        .then((savedAdmin: IAdminDocument) => {
          return savedAdmin;
        });
    });

    return Promise.all(promises);
  }
}

export { seedData };
