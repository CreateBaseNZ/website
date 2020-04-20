/*=========================================================================================
REQUIRED MODULES
=========================================================================================*/

const mongoose = require("mongoose");
const moment = require("moment-timezone");

/*=========================================================================================
GRIDFS
=========================================================================================*/

const gridFsStream = require("gridfs-stream");

let GridFS;

mongoose.createConnection(
  process.env.MONGODB_URL,
  {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  },
  (error, client) => {
    if (error) throw error;

    GridFS = gridFsStream(client.db, mongoose.mongo);
    GridFS.collection("fs");
  }
);

/*=========================================================================================
VARIABLES
=========================================================================================*/

const Schema = mongoose.Schema;

/*=========================================================================================
MODELS
=========================================================================================*/

const Comment = require("./Comment.js");

/*=========================================================================================
CREATE MAKE MODEL
=========================================================================================*/

const MakeSchema = new Schema({
  accountId: {
    type: Schema.Types.ObjectId,
  },
  sessionId: {
    type: String,
  },
  file: {
    id: {
      type: Schema.Types.ObjectId,
    },
    name: {
      type: String,
    },
  },
  status: {
    type: String,
  },
  build: {
    type: String,
  },
  quick: {
    type: String,
  },
  process: {
    type: String,
  },
  material: {
    type: String,
  },
  quality: {
    type: String,
  },
  strength: {
    type: String,
  },
  colour: {
    type: String,
  },
  quantity: {
    type: Number,
  },
  comment: {
    type: Schema.Types.ObjectId,
  },
  date: {
    awaitingQuote: {
      type: String,
    },
    checkout: {
      type: String,
    },
    purchased: {
      type: String,
    },
    modified: {
      type: String,
    },
  },
  price: {
    type: Number,
  },
});

/*=========================================================================================
STATIC
=========================================================================================*/

// @FUNC  findByAccountIdAndStatus
// @TYPE  STATICS
// @DESC
// @ARGU
MakeSchema.statics.findByAccountIdAndStatus = function (accountId, status) {
  return new Promise(async (resolve, reject) => {
    let makes;

    try {
      makes = await this.find({ accountId, status });
    } catch (error) {
      reject(error);
    }

    resolve(makes);
  });
};

// @FUNC  deleteByIdAndAccountId
// @TYPE  STATICS
// @DESC
// @ARGU
MakeSchema.statics.deleteByIdAndAccountId = function (_id, accountId) {
  return new Promise(async (resolve, reject) => {
    // Find the make to be deleted
    let make;
    try {
      make = await this.findOne({ _id, accountId });
    } catch (error) {
      reject(error);
    }
    // Delete the make
    let deletedMake;
    try {
      deletedMake = await make.deleteOne();
    } catch (error) {
      reject(error);
    }
    // Find and Delete the comment associated with the Make
    if (deletedMake.comment) {
      const commentId = mongoose.Types.ObjectId(deletedMake.comment);
      let comment;
      try {
        comment = await Comment.findOne({ _id: commentId, accountId });
      } catch (error) {
        reject(error);
      }
      try {
        await comment.deleteOne();
      } catch (error) {
        reject(error);
      }
    }
    // Delete file associated with the make
    const fileId = mongoose.Types.ObjectId(deletedMake.file.id);
    try {
      await GridFS.remove({ _id: fileId, root: "fs" });
    } catch (error) {
      reject(error);
    }
    // Return the deleted make
    resolve(deletedMake);
  });
};

/*=========================================================================================
METHOD
=========================================================================================*/

// @FUNC  updateStatus
// @TYPE  METHODS
// @DESC
// @ARGU
MakeSchema.methods.updateStatus = function (status) {
  return new Promise((resolve, reject) => {
    const statuses = ["awaitingQuote", "checkout", "purchased"];

    // VALIDATION START

    if (statuses.indexOf(status) === -1) {
      reject("invalid status");
    }

    // VALIDATION END

    const date = moment().tz("Pacific/Auckland").format();

    this.status = status;
    this.date[status] = date;
    this.date.modified = date;

    resolve();
  });
};

/*=========================================================================================
EXPORT MAKE MODEL
=========================================================================================*/

module.exports = Make = mongoose.model("make", MakeSchema);

/*=========================================================================================
END
=========================================================================================*/
