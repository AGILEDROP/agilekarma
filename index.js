/**
 * Working PlusPlus++
 * Like plusplus.chat, but one that actually works, because you can host it yourself! 😉
 *
 * @see https://github.com/tdmalone/working-plusplus
 * @see https://expressjs.com/en/4x/api.html
 * @author Tim Malone <tdmalone@gmail.com>
 */

"use strict";
require("dotenv").config();
const app = require("./src/app"),
  slack = require("./src/slack"),
  points = require("./src/points");
const fs = require("fs"),
  mime = require("mime"),
  express = require("express"),
  passport = require("passport"),
  cors = require("cors"),
  bodyParser = require("body-parser"),
  cookieParser = require("cookie-parser"),
  slackClient = require("@slack/client"),
  session = require("express-session"),
  flash = require("connect-flash"),
  queryString = require("querystring"),
  axios = require("axios");

const GoogleStrategy = require("passport-google-oauth20"); // require('passport-google-oauth20').Strategy;

/* eslint-disable no-process-env, no-magic-numbers */
const PORT = process.env.SCOREBOT_PORT || 80; // Let Heroku set the port.
const SLACK_OAUTH_ACCESS_TOKEN = process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN;
const protocol = process.env.SCOREBOT_USE_SSL !== "1" ? "http://" : "https://";
const frontendUrl = process.env.SCOREBOT_LEADERBOARD_URL;
const FRONTEND_URL = protocol + frontendUrl;
const google_id = process.env.GOOGLE_CLIENT_ID;
const google_secret = process.env.GOOGLE_CLIENT_SECRET;

/* eslint-enable no-process-env, no-magic-numbers */

/**
 * Starts the server and bootstraps the app.
 *
 * @param {object} options Optional. Allows passing in replacements for the default Express server
 *                         module (`express` property) and Slack Web API client module (`slack`
 *                         property).
 * @returns {http.Server} A Node.js http.Server object as returned by Express' listen method. See
 *                        https://expressjs.com/en/4x/api.html#app.listen and
 *                        https://nodejs.org/api/http.html#http_class_http_server for details.
 */
const bootstrap = (options = {}) => {
  // Allow alternative implementations of both Express and Slack to be passed in.
  const server = options.express || express();
  slack.setSlackClient(
    options.slack || new slackClient.WebClient(SLACK_OAUTH_ACCESS_TOKEN)
  );

  server.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", FRONTEND_URL); // update to match the domain you will make the request from
    // res.header("Access-Control-Allow-Origin", '*');
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  });

  // let access_token;

  server.use(cors());
  server.use(express.json());
  server.use(express.urlencoded({ extended: false }));
  // server.use(cors({
  //   'allowedHeaders': ['sessionId', 'Content-Type'],
  //   'exposedHeaders': ['sessionId'],
  //   'methods': ['GET', 'POST'],
  //   'credentials': true,
  //   'origin': ['http://127.0.0.1:3000', 'http://localhost:3000', 'http://localhost:5000'], // here goes Frontend IP
  // }));

  /** Google OAuth2 authentication
   *
   * Allows for signing in with Google accounts
   *
   * Limited to @agiledrop.com through Google dashboard
   * by setting the app to internal only
   */

  // Obtain access_token and refresh_token from Google
  // using authorization token

  const getAccessToken = async (token) => {
    const googleEndpoint = "https://oauth2.googleapis.com/token";

    const accessTokenParams = {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `http://localhost:3000`,
      code: token,
      grant_type: "authorization_code",
    };
    try {
      const { data } = await axios({
        method: "post",
        url: `${googleEndpoint}?${queryString.stringify(accessTokenParams)}`,
      });

      return data;
    } catch (error) {
      console.log("Failed to fetch Google Oauth tokens");
      throw new Error(error);
    }
  };

  /* Route authentication middleware
     Checks request header for access_token
  */

  const requireAuth = async (req, res, next) => {
    const authorization = req.headers.authorization;
    try {
      const { data } = await axios({
        method: "post",
        url: `https://www.googleapis.com/oauth2/v3/userinfo?alt=json&access_token=${authorization}`,
      });

      if (data) {
        next();
      }
    } catch (error) {
      console.log(error);
    }
  };

  // route to receive authorization token from the frontend

  server.post("/auth/google", async (req, res) => {
    const authToken = req.body.code;
    try {
      const response = await getAccessToken(authToken);

      res.json(response);
    } catch (error) {
      res.sendStatus(500);
      console.log(error);
    }
  });

  server.enable("trust proxy");
  server.get("/", app.handleGet);
  server.post("/", app.handlePost);

  // Static assets.
  server.get("/assets/*", (request, response) => {
    const path = "src/" + request._parsedUrl.path,
      type = mime.getType(path);

    response.setHeader("Content-Type", type);
    response.send(fs.readFileSync(path));
  });

  // Additional routes.
  server.get("/leaderboard", requireAuth, app.handleGet);
  server.get("/channels", requireAuth, app.handleGet);
  server.get("/fromusers", requireAuth, app.handleGet);
  server.get("/karmafeed", requireAuth, app.handleGet);
  server.get("/userprofile", requireAuth, app.handleGet);

  return server.listen(PORT, () => {
    console.log("Listening on port " + PORT + ".");
  });
}; // Bootstrap.

// If module was called directly, bootstrap now.
if (require.main === module) {
  bootstrap();
}

module.exports = bootstrap;
