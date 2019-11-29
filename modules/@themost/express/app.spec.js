
const path = require('path');
const ExpressDataApplication = require('./app').ExpressDataApplication;
const request = require('supertest');
const express = require('express');
const { HttpNotFoundError } = require('@themost/common');

describe('ExpressDataApplication', () => {
    /**
     * express application for testing
     * @type {*|Express}
     */
    let app;
    /**
     * A router for testing
     * @type {Router}
     */
    let testRouter = express.Router();
    beforeAll(() => {
        app = express();
        // create a new instance of data application
        const dataApplication = new ExpressDataApplication(path.resolve(__dirname, 'test/config'));
        // hold data application
        app.set('ExpressDataApplication', dataApplication);
        // use data middleware (register req.context)
        app.use(dataApplication.middleware(app));
        // set testRouter
        app.use('/', testRouter);
    });

    beforeEach(() => {
        // clear test router before each test
        if (testRouter.stack) {
            testRouter.stack = [];
        }
    });

    it('should use new ExpressDataApplication()', async ()=> {
        const dataApplication = new ExpressDataApplication();
        expect(dataApplication).toBeTruthy();
    });

    it('should use Request.context', async ()=> {
        testRouter.get('/', (req, res, next) => {
            if (req.context == null) {
                return next(new Error('Request context may not be empty.'))
            }
            return res.json({
                message: 'Hello World!'
            });
        });
        let response = await request(app)
            .get('/')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.message).toBe('Hello World!');
    });

    it('should use Request.context.model()', async ()=> {
        testRouter.get('/api/foo/', (req, res, next) => {
            const model = req.context.model('foo');
            if (model == null) {
                return next(new HttpNotFoundError());
            }
            return res.json({
                name: model.name
            });
        });
        let response = await request(app)
            .get('/api/foo/')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(404);

        testRouter.get('/api/users/schema/', (req, res, next) => {
            const model = req.context.model('Users');
            if (model == null) {
                return next(new HttpNotFoundError());
            }
            return res.json({
                name: model.name
            });
        });
        response = await request(app)
            .get('/api/users/schema/')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
    });

    it('should get anonymous user', async () => {
        testRouter.get('/api/users/me/', (req, res, next) => {
            req.context.model('Users')
                .where('name').equal('anonymous')
                .getItem().then( value => {
                return res.json(value);
            });
        });
        let response = await request(app)
            .get('/api/users/me/')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.name).toBe('anonymous');
    });

});
