var express = require('express');
var router = express.Router();

/* GET /people get persons listing. */
router.get('/', function(req, res, next) {
  req.context.model('Person').filter(req.query).then(function(q) {
      return q.getList().then(function(result) {
          return res.json(result);
      });
  }).catch(function(err) {
      return next(err);
  });
});

/* POST /people insert or update a person or an array of persons. */
router.post('/', function(req, res, next) {
  if (typeof req.body === 'undefined') {
    return res.status(400).send();
  }
  req.context.model('Person').save(req.body).then(function() {
    return res.json(req.body);
  }).catch(function(err) {
      return next(err);
  });
});

/* GET /person/:id get a person by id. */
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

/* DELETE /person/:id delete a person by id. */
router.delete('/:id', function(req, res, next) {
  req.context.model('Person').where('id').equal(req.params.id).count().then(function(value) {
    if (value === 0) {
      return res.status(404).send();
    }
    // construct a native object
    var obj = {
      "id": req.params.id
    };
    //try to delete
    return req.context.model('Person').remove(obj).then(function() {
      return res.json(obj);
    });
  }).catch(function(err) {
      return next(err);
  });
});



module.exports = router;
