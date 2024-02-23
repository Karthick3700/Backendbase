/* eslint-disable no-undef */
"use strict";

module.exports = (async () => {
  const path = require("path");
  require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

  const mongooseConn = require("./configs/mongodb");
  let mongoose = await mongooseConn();


  const constants = require("./configs/constants");
  const utils = require("./utils/util");
  const config = require("./configs/config");
  const fs = require("fs");

  const modelPath = config.root + "/models";

  fs.readdirSync(modelPath).forEach(function (file) {
    console.log("Loading models : " + file);
    require(modelPath + "/" + file + "/schema.js")(mongoose, utils, config, constants);
  });

  const cron = require("node-cron");

  const cronSer = require("./services/cron/index")(mongoose, utils, config, constants);

  // reference: https://crontab.guru/every-5-minutes


    cron.schedule("0 12 * * *", function () {
      cronSer.deActiveCoupon();
      return cronSer.activeCoupon();
    });

})();
