/*=========================================================================================
REQUIRED MODULES
=========================================================================================*/

const mongoose = require("mongoose");

/*=========================================================================================
VARIABLES
=========================================================================================*/

const Schema = mongoose.Schema;

/*=========================================================================================
SUB MODELS
=========================================================================================*/

const AddressSchema = new Schema({
  unit: {
    type: String
  },
  street: {
    number: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  suburb: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  postcode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  }
});

/*=========================================================================================
CREATE CUSTOMER MODEL
=========================================================================================*/

const CustomerSchema = new Schema({
  accountId: {
    type: Schema.Types.ObjectId
  },
  displayName: {
    type: String
  },
  address: {
    type: AddressSchema
  },
  wallet: {
    amount: {
      type: Number,
      default: 0
    }
  }
});

/*=========================================================================================
METHODS
=========================================================================================*/

// @FUNC  updateAddress
// @TYPE  METHODS
// @DESC
// @ARGU  address - object -
CustomerSchema.methods.updateAddress = address => {
  return new Promise(async (resolve, reject) => {
    this.address = address;
    let savedCustomer;
    try {
      savedCustomer = await this.save();
    } catch (error) {
      reject({
        status: "failed",
        message: error
      });
    }
    resolve(savedCustomer);
  });
};

/*=========================================================================================
EXPORT CUSTOMER MODEL
=========================================================================================*/

module.exports = Customer = mongoose.model("customers", CustomerSchema);

/*=========================================================================================
END
=========================================================================================*/
