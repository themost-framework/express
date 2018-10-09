var express = require('express');
var router = express.Router();
var pluralize = require("pluralize");

/* GET /:entitySet  */
router.get('/:entitySet', function(req, res, next) {
  if (pluralize.isSingular(req.params.entitySet)) {
    return next();
  }
    var thisModel = req.context.model(pluralize.singular(req.params.entitySet));
    if (typeof thisModel === 'undefined') {
        return next();
    }
  thisModel.filter(req.query).then(function(q) {
      return q.getList().then(function(result) {
          return res.json(result);
      });
  }).catch(function(err) {
      return next(err);
  });
});

/* POST /:entitySet insert or update a data object or an array of data objects. */
router.post('/:entitySet', function(req, res, next) {
   if (pluralize.isSingular(req.params.entitySet)) {
    return next();
  }
    var thisModel = req.context.model(pluralize.singular(req.params.entitySet));
    if (typeof thisModel === 'undefined') {
        return next();
    }
  if (typeof req.body === 'undefined') {
    return res.status(400).send();
  }
  thisModel.save(req.body).then(function() {
    return res.json(req.body);
  }).catch(function(err) {
      return next(err);
  });
});

/* GET /:entitySet/:id get a data object by id. */
router.get('/:entitySet/:id', function(req, res, next) {
   if (pluralize.isSingular(req.params.entitySet)) {
    return next();
  }
    var thisModel = req.context.model(pluralize.singular(req.params.entitySet));
    if (typeof thisModel === 'undefined') {
        return next();
    }
  thisModel.where(thisModel.primaryKey).equal(req.params.id).getItem().then(function(value) {
    if (typeof value === 'undefined') {
      return res.status(204).send();
    }
      return res.json(value);
  }).catch(function(err) {
      return next(err);
  });
});

/* DELETE /person/:id delete a data object by id. */
router.delete('/:entitySet/:id', function(req, res, next) {
   if (pluralize.isSingular(req.params.entitySet)) {
    return next();
  }
    var thisModel = req.context.model(pluralize.singular(req.params.entitySet));
    if (typeof model === 'undefined') {
        return next();
    }
  thisModel.where(thisModel.primaryKey).equal(req.params.id).count().then(function(value) {
    if (value === 0) {
      return res.status(404).send();
    }
    // construct a native object
    var obj = {
      "id": req.params.id
    };
    //try to delete
    return thisModel.remove(obj).then(function() {
      return res.json(obj);
    });
  }).catch(function(err) {
      return next(err);
  });
});



module.exports = router;
