/*=========================================================================================
REQUIRED MODULES
=========================================================================================*/

const express = require("express");
const path = require("path");
const passport = require("passport");

/*=========================================================================================
VARIABLES
=========================================================================================*/

const router = new express.Router();
const routeOptions = {
  root: path.join(__dirname, "../../views/admin/"),
};

/*=========================================================================================
MODELS
=========================================================================================*/

/*=========================================================================================
MIDDLEWARE
=========================================================================================*/

const adminAccess = (req, res, next) => {
  if (req.isAuthenticated() && req.user.type === "admin") {
    return next();
  } else {
    res.redirect("/");
  }
};

/*=========================================================================================
ROUTES
=========================================================================================*/

// @route     Get /admin/file
// @desc
// @access    Admin
router.get("/admin/file", adminAccess, (req, res) => {
  res.sendFile("file.html", routeOptions);
});

// @route     Get /admin/test
// @desc
// @access    Admin
router.get("/admin/test", adminAccess, (req, res) => {
  res.sendFile("test.html", routeOptions);
});

// @route     Get /admin/make
// @desc
// @access    Admin
router.get("/admin/make", adminAccess, (req, res) => {
  res.sendFile("make.html", routeOptions);
});

// @route     Get /admin/discount
// @desc
// @access    Admin
router.get("/admin/discount", adminAccess, (req, res) => {
  res.sendFile("discount.html", routeOptions);
});

/*=========================================================================================
EXPORT ROUTE
=========================================================================================*/

module.exports = router;

/*=========================================================================================
END
=========================================================================================*/
