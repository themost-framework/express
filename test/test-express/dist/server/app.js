"use strict";
var _express = _interopRequireDefault(require("express"));
var _ejsLocals = _interopRequireDefault(require("ejs-locals"));
var _path = _interopRequireDefault(require("path"));
var _cookieParser = _interopRequireDefault(require("cookie-parser"));
var _expressSession = _interopRequireDefault(require("express-session"));
var _cookieSession = _interopRequireDefault(require("cookie-session"));
var _passport = _interopRequireDefault(require("passport"));
var _auth = _interopRequireDefault(require("./routes/auth"));
var _morgan = _interopRequireDefault(require("morgan"));
var _nodeSassMiddleware = _interopRequireDefault(require("node-sass-middleware"));
var _express2 = require("@themost/express");
var _index = _interopRequireDefault(require("./routes/index"));
var _users = _interopRequireDefault(require("./routes/users"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

/**
                                                                                                                                                              * @name Request#context
                                                                                                                                                              * @description Gets an instance of ExpressDataContext class which is going to be used for data operations
                                                                                                                                                              * @type {ExpressDataContext}
                                                                                                                                                              */
/**
                                                                                                                                                                  * @name express.Request#context
                                                                                                                                                                  * @description Gets an instance of ExpressDataContext class which is going to be used for data operations
                                                                                                                                                                  * @type {ExpressDataContext}
                                                                                                                                                                  */

/**
                                                                                                                                                                      * Initialize express application
                                                                                                                                                                      * @type {Express}
                                                                                                                                                                      */
let app = (0, _express.default)();

// use ejs-locals for all ejs templates
app.engine('ejs', _ejsLocals.default);
// view engine setup
app.set('views', _path.default.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use((0, _morgan.default)('dev'));

app.use(_express.default.json({
  reviver: _express2.dateReviver }));

app.use(_express.default.urlencoded({ extended: false }));

// @themost/data data application setup
const dataApplication = new _express2.ExpressDataApplication(_path.default.resolve(__dirname, 'config'));
// hold data application
app.set('ExpressDataApplication', dataApplication);
// use cookie parser
const secret = dataApplication.getConfiguration().getSourceAt('settings/crypto/key');
// use cookie parser
app.use((0, _cookieParser.default)(secret));

// use session
app.use((0, _cookieSession.default)({
  name: 'session',
  keys: [secret] }));

// use data middleware (register req.context)
app.use(dataApplication.middleware());
// use passport
app.use((0, _auth.default)(_passport.default));
// use sass middleware
app.use((0, _nodeSassMiddleware.default)({
  src: _path.default.join(process.cwd(), 'public'),
  dest: _path.default.join(process.cwd(), 'public'),
  indentedSyntax: false, // true = .sass and false = .scss
  sourceMap: true }));

// use static content
app.use(_express.default.static(_path.default.join(process.cwd(), 'public')));

app.use('/', _index.default);

app.use('/users', _users.default);
// use @themost/express service router
app.use('/api', _passport.default.authenticate('basic'), _express2.serviceRouter);

// error handler
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || err.statusCode || 500);
  res.render('error');
});

module.exports = app;
//# sourceMappingURL=app.js.map