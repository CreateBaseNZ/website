/*=========================================================================================
REQUIRED MODULES
=========================================================================================*/

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const express = require("express");
const mongoose = require("mongoose");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/*=========================================================================================
VARIABLES
=========================================================================================*/

const router = new express.Router();

/*=========================================================================================
MODELS
=========================================================================================*/

const Account = require("../model/Account.js");
const Customer = require("../model/Customer.js");
const Discount = require("../model/Discount.js");
const Order = require("../model/Order.js");
const Make = require("../model/Make.js");
const Transaction = require("../model/Transaction.js");

/*=========================================================================================
MIDDLEWARE
=========================================================================================*/

const verifiedAccess = (req, res, next) => {
  if (req.isAuthenticated()) {
    if (req.user.verification.status) {
      return next();
    } else {
      return res.redirect("/verification");
    }
  } else {
    return res.sendFile("login.html", customerRouteOptions);
  }
};

const verifiedDataAccess = (req, res, next) => {
  if (req.isAuthenticated()) {
    if (req.user.verification.status) {
      return next();
    } else {
      return res.send({ status: "failed", content: "need to verify" });
    }
  } else {
    return res.redirect("/login");
  }
};

const restrictedAccess = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    return res.sendFile("login.html", customerRouteOptions);
  }
};

const unrestrictedAccess = (req, res, next) => {
  if (req.isAuthenticated()) {
    // TO DO .....
    // REDIRECT TO ALREADY LOGGED IN PAGE
    // TO DO .....
    return res.redirect("/"); // TEMPORARILY SEND THEM BACK HOME
  } else {
    return next();
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

// @route     GET /checkout/fetch-order
// @desc
// @access    PUBLIC
router.get("/checkout/fetch-order", async (req, res) => {
  // DECLARE AND INITIALISE VARIABLES
  const status = "created";
  const wallet = req.user.wallet;
  let accountId = undefined;
  let sessionId = req.sessionID;
  let promisesOne = [Order.findOne({ sessionId, status })];
  if (req.isAuthenticated()) {
    accountId = req.user._id;
    sessionId = undefined;
    promisesOne = [Order.findOne({ accountId, status }), Transaction.fetchBalance(accountId)];
  }
  // FETCH EXISTING CREATED ORDER
  let order;
  try {
    [order, balance] = await Promise.all(promisesOne);
  } catch (data) {
    if (!data.status) {
      return res.send({ status: "error", content: data });
    }
    return res.send(data);
  }
  if (!order) {
    // CREATE A NEW ORDER
    const object = { accountId, sessionId, status };
    try {
      order = await Order.build(object, false);
    } catch (data) {
      return res.send(data);
    }
  }
  // UPDATE MAKES, DISCOUNTS AND SAVED ADDRESS
  const promisesTwo = [order.updateMakes(), order.updateDiscounts(), order.updateSavedAddress()];
  let makes, discounts;
  try {
    [makes, discounts] = await Promise.all(promisesTwo);
  } catch (data) {
    return res.send(data);
  }
  // GET ORDER'S AMOUNT OBJECT AND SAVE THE NEW/UPDATED ORDER
  const promiseThree = [order.amount(), order.save()];
  let amount;
  try {
    [amount] = await Promise.all(promiseThree);
  } catch (data) {
    if (!data.status) {
      return res.send({ status: "error", content: data });
    }
    return res.send(data);
  }
  // Validate Order
  const validity = order.validateAll();
  // SUCCESS HANDLER
  return res.send({ status: "succeeded", content: { order, makes, discounts, amount, validity, wallet, balance } });
});

// @route     POST /checkout/update
// @desc
// @access    Private
router.post("/checkout/update", verifiedAccess, async (req, res) => {
  // DECLARE VARIABLES
  const accountId = req.user._id;
  const sessionId = req.sessionID;
  const updates = req.body.updates;
  // FETCH THE ORDER
  let order;
  // Create the query
  let query;
  if (accountId) {
    query = { accountId, status: "created" };
  } else {
    query = { sessionId, status: "created" };
  }
  // Fetch the active order
  try {
    order = await Order.findOne(query);
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // UPDATE ORDER
  order.update(updates);
  // SAVE ORDER
  try {
    await order.save();
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // CALCULATE ORDER'S AMOUNT 
  let amount;
  try {
    amount = await order.amount();
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // VALIDATION
  const validity = order.validateAll();
  return res.send({ status: "success", content: { order, amount, validity } });
});

// @route GET /checkout/validate
// @desc
// @access    Private
router.get("/checkout/validate", verifiedAccess, async (req, res) => {
  // DECLARE VARIABLES
  const accountId = req.user._id;
  const sessionId = req.sessionID;
  // BUILD THE ORDER
  let order;
  // Create the query
  let query;
  if (accountId) {
    query = { accountId, status: "created" };
  } else {
    query = { sessionId, status: "created" };
  }
  // Fetch the active order
  try {
    order = await Order.find(query);
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // VALIDATION
  const validity = order.validateAll();
  return res.send({ status: "success", content: validity });
});

// @route     POST /checkout/order/delete/print
// @desc
// @access    Private
router.post("/checkout/order/delete/print", verifiedAccess, async (req, res) => {
  // Delete the make document and the corresponding file from the database
  const accountId = mongoose.Types.ObjectId(req.user._id);
  const sessionId = req.sessionID;
  const makeId = mongoose.Types.ObjectId(req.body.printId);
  // DELETE THE MAKE
  let deletedMake;
  try {
    deletedMake = await Make.deleteByIdAndAccountId(makeId, accountId);
  } catch (error) {
    // If error was encountered, send a failed status
    return res.send({ status: "failed", content: error });
  }
  // UPDATE THE ORDER INSTANCE
  let order;
  // Create the find object
  let object;
  if (accountId) {
    object = { accountId, status: "created" };
  } else {
    object = { sessionId, status: "created" };
  }
  // Fetch existing active order
  try {
    order = await Order.find(object);
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // Update makes
  try {
    await order.updateMakes();
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // Save the make
  try {
    await order.save();
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // Validate the checkout
  const validity = order.validateAll();
  // Send back a success status
  return res.send({ status: "success", content: validity });
});

// @route     GET /checkout/order-amount
// @desc      Fetch the object containing the amounts of the order
// @access    Private
router.get("/checkout/order-amount", verifiedAccess, async (req, res) => {
  // DECLARE VARIABLES
  const accountId = req.user._id;
  const sessionId = req.sessionID;
  // BUILD THE ORDER
  let order;
  // Create the find object
  let object;
  if (accountId) {
    object = { accountId, status: "created" };
  } else {
    object = { sessionId, status: "created" };
  }
  // Fetch the active order
  try {
    order = await Order.find(object);
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // Calculate Order Amounts 
  let amount;
  try {
    amount = await order.amount();
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // Send the amount object to the client
  return res.send({ status: "success", content: amount });
})

// @route     GET /checkout/bank-transfer
// @desc      This route processes the bank transfer payment for
//            the customer's order.
// @access    Private
router.get("/checkout/bank-transfer", verifiedDataAccess, async (req, res) => {
  // DECLARE VARIABLES
  const accountId = req.user._id;
  // BUILD THE ORDER
  // Create the find object
  const query = { accountId, status: "created" };
  // Fetch existing active order
  let order;
  try {
    order = await Order.transaction(query, false);
  } catch (error) {
    return res.send(error);
  }
  // PROCESS ORDER
  try {
    await order.processCheckedout();
  } catch (error) {
    return res.send(error);
  }
  // SAVE ORDER
  try {
    await order.save();
  } catch (error) {
    return res.send({ status: "error", content: error });
  }
  // Return a success message
  return res.send({ status: "success", content: "checkout successful" });
});

// @route     POST /checkout/card-payment
// @desc      
// @access    Private
router.post("/checkout/card-payment", verifiedDataAccess, async (req, res) => {
  const account = req.user;
  // VALIDATE THE PAYMENT INTENT
  // Declare Variables
  const paymentIntentId = req.body.paymentIntentId;
  // Check if client secret is provided
  if (!paymentIntentId) {
    return res.send({ status: "failed", content: "no payment intent ID provided" });
  }
  // Retrieve payment intent
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // Validate the success of the payment
  if (paymentIntent.status !== "succeeded") {
    return res.send({ status: "failed", content: "payment unsuccessful" });
  }
  // CREATE TRANSACTION TICKET FOR THE ONLINE PAYMENT
  let onlinePayment;
  try {
    onlinePayment = await Transaction.onlinePayment(account._id, paymentIntent.amount);
  } catch (error) {
    return res.send(error);
  }
  // UPDATE ORDER DETAILS
  // Declare variables
  const sessionId = req.sessionID;
  // Build the order
  let order;
  // Create the query
  let query;
  if (account._id) {
    query = { accountId: account._id, status: "created" };
  } else {
    query = { sessionId, status: "created" };
  }
  try {
    order = await Order.transaction(query, false);
  } catch (data) {
    return res.send(data);
  }
  // PROCESS ORDER
  try {
    await order.processCheckedout();
  } catch (data) {
    return res.send(data);
  }
  // SAVE ORDER
  try {
    await order.save();
  } catch (error) {
    return res.send({ status: "error", content: error });
  }
  // Return a success message
  return res.send({ status: "success", content: "checkout successful" });
})

// @route     GET /orders/print/update
// @desc      Update the quantity of the 3D print order
// @access    Private
router.post("/checkout/make/update", verifiedAccess, async (req, res) => {
  // DECLARE VARIABLES
  const accountId = req.user._id;
  const sessionId = req.sessionID;
  const makeId = req.body.makeId;
  const updates = req.body.updates;
  // FETCH MAKE
  let make;
  try {
    make = await Make.findOne({ _id: makeId });
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // UPDATE MAKE
  make.update(updates);
  // SAVE MAKE
  try {
    await make.save();
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // FETCH THE ORDER
  let order;
  // Create the query
  let query;
  if (accountId) {
    query = { accountId, status: "created" };
  } else {
    query = { sessionId, status: "created" };
  }
  // Fetch the active order
  try {
    order = await Order.findOne(query);
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // CALCULATE ORDER'S AMOUNT 
  let amount;
  try {
    amount = await order.amount();
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // RETURN SUCCESS
  return res.send({ status: "success", content: amount });
});

// @route     POST /checkout/discount/add
// @desc      
// @access    Private
router.post("/checkout/discount/add", verifiedAccess, async (req, res) => {
  // FETCH DISCOUNT WITH THE SAID CODE
  const account = req.user;
  const code = req.body;
  // Fetch Discount
  let discount;
  try {
    discount = await Discount.findOne({ code });
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // Validate the discount
  if (!discount) return res.send({ status: "failed", content: "no discount" });
  // Duration
  const startMoment = moment(discount.duration.start);
  switch (discount.duration.type) {
    case "unlimited":
      if (todayMoment.diff(startMoment) >= 0) break;
      return res.send({ status: "failed", content: "discount is inactive" });
    case "limited":
      const endMoment = moment(discount.duration.end);
      if ((todayMoment.diff(startMoment) >= 0) && (endMoment.diff(todayMoment) >= 0)) break;
      return res.send({ status: "failed", content: "discount is inactive" });
    default:
      return res.send({ status: "failed", content: "discount is inactive" });
  }
  // Audience
  switch (discount.audience.type) {
    case "global":
      break;
    case "account":
      if (discount.audience.accounts.indexOf(account.type) !== -1) break;
      return res.send({ status: "failed", content: "invalid account type" });
    case "customer":
      if (discount.audience.customers.indexOf(account._id) !== -1) break;
      return res.send({ status: "failed", content: "invalid account type" });
    default:
      return res.send({ status: "failed", content: "invalid account type" });
  }
  // FETCH THE USERS ORDERS
  let orders;
  try {
    orders = await Order.find({ accountId: account._id });
  } catch (error) {
    return res.send({ status: "failed", content: "no orders" });
  }
  // Order-based validation
  const activeOrder = (orders.filter(order => (order.status === "created")))[0];
  if (!activeOrder) return res.send({ status: "failed", content: "no active order" });
  if (activeOrder.discounts.indexOf(discount._id) !== -1) {
    return res.send({ status: "failed", content: "discount already exist" });
  }
  orders = orders.filter(order => {
    if (order.discounts.indexOf(discount._id) !== -1) return true;
    return false;
  });
  if (discount.usage.limit <= orders.length) {
    return res.send({ status: "failed", content: "discount limit reached" });
  }
  // SUCCESS RESPONSE
  return res.send({ status: "failed", content: discount });
});

/*-----------------------------------------------------------------------------------------
PAYMENT
-----------------------------------------------------------------------------------------*/

router.get("/checkout/payment-intent", async (req, res) => {
  // DECLARE VARIABLES
  const accountId = req.user._id;
  const sessionId = req.sessionID;
  // BUILD THE ORDER
  let order;
  // Create the find object
  let query;
  if (accountId) {
    query = { accountId, status: "created" };
  } else {
    query = { sessionId, status: "created" };
  }
  // Fetch existing active order
  try {
    order = await Order.findOne(query);
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // CREATE THE PAYMENT INTENT OBJECT
  let object;
  try {
    object = await createPaymentIntentObject(accountId, order);
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // CREATE PAYMENT INTENT
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create(object);
  } catch (error) {
    return res.send({ status: "failed", content: error });
  }
  // RETURN THE CLIENT SECRET TO THE FRONT END
  const clientSecret = paymentIntent["client_secret"];
  return res.send({ status: "success", content: clientSecret });
});

/*=========================================================================================
FUNCTIONS
=========================================================================================*/

/*-----------------------------------------------------------------------------------------
PAYMENT
-----------------------------------------------------------------------------------------*/

// Details:     Create the Payment Intent Object
// Required:    amount (integer)
//              currency (string)
const createPaymentIntentObject = (accountId, order, options) => {
  return new Promise(async (resolve, reject) => {
    // FETCH USER DETAILS
    let account;
    try {
      account = await Account.findById(accountId);
    } catch (error) {
      return reject(error);
    }
    // CALCULATE ORDER PRICE
    let amount;
    try {
      amount = await order.amount();
    } catch (error) {
      return reject(error);
    }

    // CREATE THE PAYMENT INTENT OBJECT
    const object = {
      amount: (Math.floor(amount.total.total * 100)),
      currency: "nzd",
      confirm: false,
      payment_method_types: ["card"],
      receipt_email: account.email
    }
    // RETURN SUCCESS MESSAGE
    resolve(object);
    return;
  });
};

/*=========================================================================================
EXPORT ROUTE
=========================================================================================*/

module.exports = router;

/*=========================================================================================
END
=========================================================================================*/
