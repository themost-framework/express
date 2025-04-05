[![npm](https://img.shields.io/npm/v/@themost%2Fexpress.svg)](https://www.npmjs.com/package/@themost%2Fexpress)
![](https://github.com/themost-framework/express/workflows/test/badge.svg)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/15b61e7d887344358d3b9f15da638ba0)](https://www.codacy.com/gh/themost-framework/express/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=themost-framework/express&amp;utm_campaign=Badge_Grade)
![GitHub top language](https://img.shields.io/github/languages/top/themost-framework/express)
[![License](https://img.shields.io/npm/l/@themost/express.svg)](/LICENSE)
![GitHub last commit](https://img.shields.io/github/last-commit/themost-framework/express)
![GitHub Release Date](https://img.shields.io/github/release-date/themost-framework/express)
[![npm](https://img.shields.io/npm/dw/@themost/data)](https://www.npmjs.com/package/@themost%2Fexpress)

## @themost/express
@themost-framework middleware for express.js

### Installation

    npm i @themost/express

### Generate new project

Install @themost/cli globally

    npm i @themost/cli -g

Generate a new project by executing the following command:

    themost new project my-app  --template express

Go to project's directory:

    cd my-app
  
Install dependencies:

    npm i
  
and serve the new application by executing:

    npm run serve
  
Open your browser and navigate to [http://127.0.0.1:3000](http://127.0.0.1:3000)
    
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
    app.use(dataApplication.middleware(app));
    
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

### Extend application container

Use ExpressDataApplication#container to access and extend parent application. The following example represents an application service which extends container application router

    # MyApplicationService.js
 
    export class MyApplicationService extends ApplicationService {
        constructor(app) {
            super(app);
            // subscribe for container
            app.container.subscribe( container => {
                if (container) {
                    // create a router
                    const newRouter = express.Router();
                    newRouter.get('/message', (req, res) => {
                        return res.json({
                            message: 'Hello World'
                        });
                    });
                    newRouter.get('/status', (req, res) => {
                        return res.json({
                            status: 'ok'
                        });
                    });
                    // use router
                    container.use('/a', newRouter);
                }
            });
        }
    }
    
    
    # app.js
    import {MyApplicationService} from './MyApplicationService';
    ...
    // use data application middleware
    app.use(dataApplication.middleware(app));
    // add application service
    dataApplication.useService(MyApplicationService);
    
### Extend service router

`@themost/express#serviceRouter` router may be extended to include extra service endpoints:

    # ServiceRouterExtension.js
 
    class ServiceRouterExtension extends ApplicationService {
    constructor(app) {
            super(app);
            app.serviceRouter.subscribe( serviceRouter => {
                // create new router
                const addRouter = express.Router();
                addRouter.get('/users/me/status', (req, res) => {
                    return res.json({
                        status: 'ok'
                    });
                });
                // insert router at the beginning of serviceRouter.stack
                serviceRouter.stack.unshift.apply(serviceRouter.stack, addRouter.stack);
            });
        }
    }

    # app.js

    const app = express();
    // create a new instance of data application
    const application = new ExpressDataApplication(path.resolve(__dirname, 'test/config'));
    // use extension
    application.useService(ServiceRouterExtension);
    app.use(express.json({
        reviver: dateReviver
    }));
    // hold data application
    app.set('ExpressDataApplication', application);
    // use data middleware (register req.context)
    app.use(application.middleware(app));
    ...
    // user service router
    app.use('/api/', passport.authenticate('bearer', { session: false }), serviceRouter);

### Use Response Formatters

ResponseFormatter service formats responses based on `Accept` request header.

The available response formatters are:

- JsonResponseFormatter which is the default response formatter and returns JSON response.
- XmlResponseFormatter which returns XML response.

A response formatter may be added in ResponseFormatter#formatters collection:

    // add application/json formatter
    this.formatters.set('application/json', JsonResponseFormatter);
    // add application/xml formatter
    this.formatters.set('application/xml', JsonResponseFormatter);

An example of custom formatter:

    class MyJsonFormatter extends HttpResponseFormatter {
        
        execute(req, res) {
            return res.json(data);
        }        
    }

Note: ResponseFormatter is not enabled by default and it should be registered after application initialization.

    import express from 'express';
    import path from 'path';
    import {ExpressDataApplication, serviceRouter, dateReviver, ResponseFormatter} from '@themost/express';
    let app = express();
    // data application setup
    let dataApplication = new ExpressDataApplication(path.resolve(__dirname, 'config')); 
    // initialize response formatter
    dataApplication.useService(ResponseFormatter);
