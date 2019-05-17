"use strict";var _express = _interopRequireDefault(require("express"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
let router = _express.default.Router();

/* GET user page. */
router.get('/me', (req, res, next) => {
  req.context.model('User').
  where('name').equal(req.context.user && req.context.user.name).
  silent().
  getItem().then(user => {
    return res.render('user', user);
  }).catch(err => {
    return next(err);
  });
});

module.exports = router;
//# sourceMappingURL=users.js.map