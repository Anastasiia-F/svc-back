const path              = require('path');
const logger            = require('morgan');
const dotenv            = require('dotenv');
const express           = require('express');
const mongoose          = require('mongoose');
const passport          = require('passport');
const bodyParser        = require('body-parser');
const errorHandler      = require('errorhandler');
const session           = require('express-session');
const expressValidator  = require('express-validator');
const MongoStore        = require('connect-mongo')(session);

const debug             = require('debug')('app');
const { red, yellow }   = require('chalk');

const cors              = require('cors');

/**
 * Load environment variables from .env file.
 */
dotenv.load({ path: '.env' });


/**
 * Create Express server.
 */
const app = express();

const port = process.env.PORT;


/**
 * Connect to MongoDB.
 */
mongoose.set('useNewUrlParser', true);
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);
mongoose.connect(`${process.env.MONGODB_URI}`);
mongoose.connection.on('error', (err) => {
  debug(err);
  debug('%s MongoDB connection error. Please make sure MongoDB is running.', red('✗'));
  process.exit();
});


/**
 * Express configuration.
 */
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.disable('x-powered-by');
app.use(expressValidator());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Enable CORS
*/
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

/**
 * Session and Passport configuration.
 */
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hrs
  unset: 'destroy',
  store: new MongoStore({
    mongooseConnection: mongoose.connection,
    stringify: false
  })
}));
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport');


/**
 * Route handlers.
 */
require('./routes')(app);


/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development') {
  // only use in development
  app.use(errorHandler());
} else {
  app.use((err, req, res, next) => {
    debug(err);
    res.status(500).send('Internal Server Error');
  });
}

app.get('/', function(request, response) {
  response.send('Hello SVC!!')
});


/**
 * Start Express server.
 */
app.listen(port, (error) => {
  console.log(`App running at port ${yellow(port)}`);
  if(error){
    console.log(error)
  }
});
