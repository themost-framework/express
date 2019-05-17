import express from 'express';
let router = express.Router();

/* GET user page. */
router.get('/me', (req, res, next) => {
  req.context.model('User')
      .where('name').equal(req.context.user && req.context.user.name)
      .silent()
      .getItem().then((user)=> {
    return res.render('user', user);
  }).catch( err => {
    return next(err);
  });
});

module.exports = router;
