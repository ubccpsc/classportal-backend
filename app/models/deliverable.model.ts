import * as mongoose from 'mongoose';
import { logger } from '../../utils/logger';

interface IDeliverableDocument extends mongoose.Document {
  courseId: string;
  name: string;
  url: string;
  open: string;
  close: string;
  gradesRelease: Boolean;
}

interface IDeliverableModel extends mongoose.Model<IDeliverableDocument> {
  findOrCreate(query: Object): Promise<IDeliverableDocument>;
}

const DeliverableSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Course',
  },
  name: {
    type: String,
  },
  url: {
    type: String,
  },
  open: {
    type: Date,
  },
  close: {
    type: Date,
  },
  gradesReleased: {
    type: Boolean,
  },
});

DeliverableSchema.static({

    /**
  * Find a user by Github username. If does not exist, then user created in DB.
  * @param {string} github username
  * @returns {Promise<IDeliverableDocument>} Returns a Promise of the user.
  */
  findOrCreate: (query: Object): Promise<IDeliverableDocument> => {
    return Deliverable
      .findOne(query)
      .exec()
      .then((deliverable) => {
        if (deliverable) {
          Promise.resolve(deliverable);
        } else {
          Deliverable.create(query)
            .then((q) => { return q.save(); })
            .catch((err) => { logger.info(err); });
        }
        return Promise.resolve(deliverable);
      });
  },
});

const Deliverable: IDeliverableModel = <IDeliverableModel>mongoose.model('Deliverable', DeliverableSchema);

export { IDeliverableDocument, IDeliverableModel, Deliverable };
