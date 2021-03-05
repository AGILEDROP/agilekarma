/**
 * Working PlusPlus++
 * Like plusplus.chat, but one that actually works, because you can host it yourself! 😉
 *
 * @see https://github.com/tdmalone/working-plusplus
 * @see https://expressjs.com/en/4x/api.html
 * @author Tim Malone <tdmalone@gmail.com>
 */

'use strict';
require( 'dotenv' ).config();
const app = require( './src/app' ),
      slack = require( './src/slack' ),
      points = require( './src/points' );

const fs = require( 'fs' ),
      mime = require( 'mime' ),
      express = require( 'express' ),
      passport = require('passport'),
      cors = require( 'cors' ),
      bodyParser = require( 'body-parser' ),
      cookieParser = require( 'cookie-parser' ),
      slackClient = require( '@slack/client' ),
      session = require( 'express-session' ),
      flash = require( 'connect-flash' );

const GoogleStrategy = require('passport-google-oauth20'); // require('passport-google-oauth20').Strategy;

/* eslint-disable no-process-env, no-magic-numbers */
const PORT = process.env.SCOREBOT_PORT || 80; // Let Heroku set the port.
const SLACK_OAUTH_ACCESS_TOKEN = process.env.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN;
const protocol = process.env.SCOREBOT_USE_SSL !== '1' ? 'http://' : 'https://';
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
const bootstrap = ( options = {}) => {

  // Allow alternative implementations of both Express and Slack to be passed in.
  const server = options.express || express();
  slack.setSlackClient( options.slack || new slackClient.WebClient( SLACK_OAUTH_ACCESS_TOKEN ) );

  passport.serializeUser((user, cb) => {
    //console.log(user);
    cb(null, user);
  });
  
  passport.deserializeUser((user, cb) => {
    // console.log(user);
    cb(null, user);
  });

  passport.use(new GoogleStrategy({
      clientID: google_id,
      clientSecret: google_secret,
      callbackURL: "/auth/google/callback"
    },
    async(accessToken, refreshToken, profile, done) => {
      try {
        const verifyEmail = await points.verifyEmail( profile._json.email );
        return done(null, profile._json.email);
      } catch ( err ) {
        console.error( err.message );
      }
    }
  ));

  server.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", FRONTEND_URL); // update to match the domain you will make the request from
    // res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });


  // let access_token;

  server.use(cors());
  // server.use(cors({
  //   'allowedHeaders': ['sessionId', 'Content-Type'],
  //   'exposedHeaders': ['sessionId'],
  //   'methods': ['GET', 'POST'],
  //   'credentials': true,
  //   'origin': ['http://127.0.0.1:3000', 'http://localhost:3000', 'http://localhost:5000'], // here goes Frontend IP
  // }));

  server.use(cookieParser());
  server.use(session({
    secret: 'secret',
    cookie:{_expires : (480 * 60 * 1000)}, // 8 hours
    saveUninitialized: false,
    resave: true,
    unset: 'destroy'
  }));
  server.use(passport.initialize());
  server.use(passport.session());
  
  server.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', "email"], accessType: 'offline', approvalPrompt: 'force' }));
  
  server.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('http://localhost:3000/');
    }
  );

  server.get("/checkAuthentication", (req, res, next) => {

    console.log("IS AUTH: " + req.isAuthenticated());

    if (req.isAuthenticated()) {
      res.sendStatus(200);
      return next();
    }

    res.sendStatus(403);
  });

  server.use(bodyParser.json());

  server.enable( 'trust proxy' );
  server.get( '/', app.handleGet );
  server.post( '/', app.handlePost );

  // Static assets.
  server.get( '/assets/*', ( request, response ) => {
    const path = 'src/' + request._parsedUrl.path,
          type = mime.getType( path );

    response.setHeader( 'Content-Type', type );
    response.send( fs.readFileSync( path ) );
  });

  // Additional routes.
  server.get( '/leaderboard', app.handleGet );
  server.get( '/channels', app.handleGet );
  server.get( '/fromusers', app.handleGet );
  server.get( '/karmafeed', app.handleGet );
  server.get( '/userprofile', app.handleGet );

  server.get( '/logout', (req, res) => {
    req.logout();
    res.redirect('http://localhost:3000/login');
  });

  return server.listen( PORT, () => {
    console.log( 'Listening on port ' + PORT + '.' );
  });

}; // Bootstrap.

// If module was called directly, bootstrap now.
if ( require.main === module ) {
  bootstrap();
}

module.exports = bootstrap;
