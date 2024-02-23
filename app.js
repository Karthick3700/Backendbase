/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
"use strict";
const path = require("path");
require("dotenv").config({
  path: path.resolve(process.cwd(), ".env"),
});

const env = process.env.NODE_ENV || "development";
const config = require("./configs/config");

// Load  modules
const express = require("express");
const morgan = require("morgan");
const useragent = require("express-useragent");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const mongooseConn = require("./configs/mongodb");
const constants = require("./configs/constants");
const utils = require("./utils/util");
const cookieParser = require("cookie-parser");

const { createServer } = require("http");

module.exports = (async () => {
  try {
    let mongoose = await mongooseConn();
    let app = express();

    const server = createServer(app);

    app.use(
      cors({
        origin: "*",
        credentials: true,
      })
    );
    app.use(helmet());
    app.use(
      helmet.contentSecurityPolicy({
        directives: {
          defaultSrc: ["'self'", config.webHost],
          styleSrc: ["'self'", "'unsafe-inline'", config.webHost],
          fontSrc: ["'self'"],
          imgSrc: ["'self'", config.webHost],
        },
      })
    );
    app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
    app.use(useragent.express());
    app.use(cookieParser());

    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

    app.use("/", express.static(path.join(__dirname, "public")));

    //to check DB status
    app.use("/healthcheck", function (req, res) {
      res.status(200).send("Database Status : Active");
    });

    //development environment only settings.
    app.use(morgan("dev")); //Options: combined/common/dev
    app.use(morgan(":method :url :status :response-time ms - :res[content-length] :req[headers]"));

    app.all("*", function (req, res, next) {
      console.log("---------------------------------------------------------------------------");
      console.log("%s %s on %s from ", req.method, req.url, new Date(), req.useragent.source);
      console.log("Request Headers: ", req.headers ? JSON.stringify(req.headers) : "");
      console.log("Request Body: ", req.body ? JSON.stringify(req.body) : "");
      console.log("---------------------------------------------------------------------------");
      next();
    });

    app.get("/", (req, res) => {
      res
        .set(
          "Content-Security-Policy",
          "default-src *; style-src 'self' http://* 'unsafe-inline'; script-src 'self' http://* 'unsafe-inline' 'unsafe-eval'"
        )
        .sendFile(__dirname + "/chat.html");
    });

    //loading all routes and models
    require("./configs/loader")(app, mongoose, utils, config, constants);
    // const socketAPI = require("./configs/socketAPI")(mongoose, utils, config, constants);
    // socketAPI.io.attach(server);

    app.use("/uploads", express.static(path.join(__dirname, "public")));

    //Handle unhandled errors, if any. At this point, we will just kill the process and let the master cluster process spawn a new cluster.
    app.use((err, req, res, next) => {
      console.log(err.stack);
      utils.sendResponse(req, res, "ERR", err.stack, "ERR", "ERR");
      next();
    });

    //server listening to port
    server.listen(config.port, config.host, () => {
      console.log("Api & Socket Server Listening on port :", config.port);
    });
    
  } catch (err) {
    console.error(err);
  }
})();
