# @themost/express
MOST Data ORM Extension for ExpressJS

### Installation

    npm i @themost/express
    
### Usage

Use @themost/data application as an express middleware:

    import express from 'express';
    import path from 'path';
    import {ExpressDataApplication, serviceRouter, dateReviver} from '@themost/express';
    let app = express();
    // data application setup
    let dataApplication = new ExpressDataApplication(path.resolve(__dirname, 'config'));
    // use @themost/express dateReviver helper function for parsing dates
    app.use(express.json({
      reviver: dateReviver 
    }));
    // use data application middleware
    app.use(dataApplication.middleware());
    
Use the service router for serving all the available data models:
    
    var serviceRouter = require('@themost/express').serviceRouter;
    app.use('/api', passport.authenticate('bearer', { session: false }), serviceRouter);
    
or use the traditional way of serving data:

    var peopleRouter = require('./routes/people');
    app.use('/people', peopleRouter);

    // # people.js
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