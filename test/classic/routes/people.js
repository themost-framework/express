var express = require('express');
var router = express.Router();

/* GET people listing. */
router.get('/', function(req, res, next) {
  req.context.model('Person').filter(req.query).then(function(q) {
      return q.getList().then(function(result) {
          return res.json(result);
      });
  }).catch(function(err) {
      return next(err);
  });
});

/* GET person by id. */
router.get('/:id', function(req, res, next) {
  req.context.model('Person').where('id').equal(req.params.id).getItem().then(function(value) {
    if (typeof value === 'undefined') {
      return res.status(204).send();
    }
      return res.json(value);
  }).catch(function(err) {
      return next(err);
  });
});

module.exports = router;
