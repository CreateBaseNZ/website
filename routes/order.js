/*=========================================================================================
REQUIRED MODULES
=========================================================================================*/

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const express = require("express");
const mongoose = require("mongoose");

/*=========================================================================================
VARIABLES
=========================================================================================*/

const router = new express.Router();

/*=========================================================================================
MODELS
=========================================================================================*/

const Make = require("./../model/Make.js");
const Purchase = require("./../model/Purchase.js");

/*=========================================================================================
MIDDLEWARE
=========================================================================================*/

const restrictedPages = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/login");
  }
};

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
    useUnifiedTopology: true
  },
  (error, client) => {
    if (error) throw error;

    GridFS = gridFsStream(client.db, mongoose.mongo);
    GridFS.collection("fs");
  }
);

/*=========================================================================================
ROUTES
=========================================================================================*/

// @route     GET /customer/orders/print/awaiting-quote
// @desc      Get customer's 3D print orders that are awaiting quotation
// @access    Private
router.post(
  "/customer/orders/print/awaiting-quote",
  restrictedPages,
  async (req, res) => {
    let accountId = req.user._id;
    let orders;
    try {
      orders = await getMakeOrders(accountId, "awaiting quote");
    } catch {
      throw error;
    }
    return res.send(orders);
  }
);

// @route     GET /customer/orders/print/checkout
// @desc      Get customer's 3D print orders that are ready for checkout
// @access    Private
router.post(
  "/customer/orders/print/checkout",
  restrictedPages,
  async (req, res) => {
    let accountId = req.user._id;
    let orders;
    try {
      orders = await getMakeOrders(accountId, "checkout");
    } catch {
      throw error;
    }
    return res.send(orders);
  }
);

// @route     GET /customer/orders/marketplace/checkout
// @desc      Get customer's Marketplace orders that are ready for checkout
// @access    Private
router.post(
  "/customer/orders/marketplace/checkout",
  restrictedPages,
  async (req, res) => {
    let accountId = req.user._id;
    let orders;
    try {
      orders = await getPurchaseOrders(accountId, "checkout");
    } catch {
      throw error;
    }
    return res.send(orders);
  }
);

/*=========================================================================================
FUNCTIONS
=========================================================================================*/

// THE FUNCTION TO FETCH THE ARRAY OF 3D PRINT ORDERS DEPENDING ON THE STATUS

const getMakeOrders = (accountId, status) => {
  return new Promise(async (resolve, reject) => {
    let orders;
    // If status is provided, return the array of orders containing the given status
    if (status) {
      try {
        orders = await Make.find({ accountId, status });
      } catch (error) {
        reject(error);
      }
    } else {
      try {
        orders = await Make.find({ accountId });
      } catch (error) {
        reject(error);
      }
    }
    let revisedOrders = [];
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i].toJSON();
      let fileName;
      try {
        fileName = await getFileName(order.fileId);
      } catch (error) {
        reject(error);
      }
      revisedOrders[i] = { ...order, ...{ fileName } };
    }
    resolve(revisedOrders);
  });
};

// THE FUNCTION TO FETCH THE ARRAY OF MARKETPLACE ORDERS DEPENDING ON THE STATUS

const getPurchaseOrders = (accountId, status) => {
  return new Promise(async (resolve, reject) => {
    let orders;
    // If status is provided, return the array of orders containing the given status
    if (status) {
      try {
        orders = await Purchase.find({ accountId, status });
      } catch (error) {
        reject(error);
      }
    } else {
      try {
        orders = await Purchase.find({ accountId });
      } catch (error) {
        reject(error);
      }
    }
    resolve(orders);
  });
};

// THE FUNCTION TO FETCH THE NAME OF THE FILE

const getFileName = _id => {
  return new Promise(async (resolve, reject) => {
    let fileName;
    try {
      fileName = (await GridFS.files.findOne({ _id }))["filename"];
    } catch (error) {
      reject(error);
    }
    resolve(fileName);
  });
};

/*=========================================================================================
EXPORT ROUTE
=========================================================================================*/

module.exports = router;

/*=========================================================================================
END
=========================================================================================*/