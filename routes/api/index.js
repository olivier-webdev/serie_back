const router = require("express").Router();
const apiSeries = require("./series");
const apiUsers = require("./users");

router.use("/series", apiSeries);
router.use("/users", apiUsers);

module.exports = router;
