
import path from 'path';
import {ExpressDataApplication, ApplicationServiceRouter} from './index';
import request from 'supertest';
import express from 'express';
import {HttpNotFoundError} from '@themost/common';
import BearerStrategy from 'passport-http-bearer';
import passport from 'passport';
import {DefaultDataContext, ODataModelBuilder, DataConfigurationStrategy} from "@themost/data";
/**
 * A passport strategy for testing purposes
 */
class TestPassportStrategy extends BearerStrategy {
    /**
     * @param {*=} user
     */
    constructor(user) {
        super({
            passReqToCallback: true,
            realm: 'Users'
        }, (req, token, done) => {
            return done(self.getUser());
        });
        const self = this;
        // set user
        this.getUser = () => {
            return user || {
                name: 'anonymous',
                authenticationType: 'none',
            }
        };
        this.name = 'bearer';
    }
    // noinspection JSUnusedGlobalSymbols
    authenticate(req) {
        const self = this;
        return self._verify(req, null, ()=> {
            return self.success(self.getUser());
        });
    }
}

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

    let passportStrategy = new TestPassportStrategy();
    beforeAll(() => {
        app = express();
        // create a new instance of data application
        const dataApplication = new ExpressDataApplication(path.resolve(__dirname, 'test/config'));
        // hold data application
        app.set('ExpressDataApplication', dataApplication);
        // use data middleware (register req.context)
        app.use(dataApplication.middleware(app));
        // use test passport strategy
        // noinspection JSCheckFunctionSignatures
        passport.use(passportStrategy);
        // set testRouter
        // noinspection JSCheckFunctionSignatures
        app.use('/', passport.authenticate('bearer', { session: false }), testRouter);
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

    it('should use new ExpressDataApplication.useStrategy()', async ()=> {
        const dataApplication = new ExpressDataApplication();
        class TestStrategy {
            title = 'Test Strategy';
        }
        class DefaultTestStrategy {
            title = 'Default Test Strategy';
        }
        expect(dataApplication.hasStrategy(TestStrategy)).toBeFalsy();
        dataApplication.useStrategy(TestStrategy, DefaultTestStrategy);
        expect(dataApplication.hasStrategy(TestStrategy)).toBeTruthy();
        expect(dataApplication.getStrategy(TestStrategy)).toBeTruthy();
    });

    it('should use new ExpressDataApplication.useService()', async ()=> {
        const dataApplication = new ExpressDataApplication();
        class TestService {
            title = 'A test service';
        }
        expect(dataApplication.hasService(TestService)).toBeFalsy();
        dataApplication.useService(TestService);
        expect(dataApplication.hasService(TestService)).toBeTruthy();
        expect(dataApplication.getService(TestService)).toBeInstanceOf(TestService);
    });

    it('should use new ExpressDataApplication.useModelBuilder()', async ()=> {
        const dataApplication = new ExpressDataApplication();
        dataApplication.useModelBuilder();
        expect(dataApplication.getBuilder()).toBeInstanceOf(ODataModelBuilder);
    });

    it('should use new ExpressDataApplication.createContext()', async ()=> {
        const dataApplication = new ExpressDataApplication();
        const context = dataApplication.createContext();
        expect(context).toBeInstanceOf(DefaultDataContext);
    });

    it('should use new ExpressDataContext.getStrategy()', async ()=> {
        const dataApplication = new ExpressDataApplication();
        const context = dataApplication.createContext();
        expect(context).toBeInstanceOf(DefaultDataContext);
        expect(context.getStrategy(DataConfigurationStrategy)).toBeTruthy();
    });

    it('should use new ExpressDataContext.engine()', async ()=> {
        const dataApplication = new ExpressDataApplication();
        const context = dataApplication.createContext();
        expect(context).toBeInstanceOf(DefaultDataContext);
        expect(() => {
            context.engine('.missing');
        }).toThrowError();
    });

    it('should use new ExpressDataApplication.execute()', async ()=> {
        const dataApplication = new ExpressDataApplication();
        dataApplication.execute( context => {
            expect(context).toBeInstanceOf(DefaultDataContext);
        }, err => {
            expect(err).toBeFalsy();
        });
    });

    it('should use new ExpressDataApplication.getService(ApplicationServiceRouter)', async ()=> {
        const dataApplication = new ExpressDataApplication();
        const service = dataApplication.getService(ApplicationServiceRouter);
        expect(service).toBeInstanceOf(ApplicationServiceRouter);
        expect(service.serviceRouter).toBeTruthy();
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

    it('should get context user', async () => {
        testRouter.get('/api/users/me/', (req, res) => {
            req.context.model('Users')
                .where('name').equal(req.context.user.name)
                .expand('groups')
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
        // change user
        spyOn(passportStrategy, 'getUser').and.returnValue({
           name: 'alexis.rees@example.com'
        });
        response = await request(app)
            .get('/api/users/me/')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.name).toBe('alexis.rees@example.com');

    });

    it('should use ExpressDataApplication.container', async ()=> {
        /**
         * @type {ExpressDataApplication}
         */
        const dataApplication = app.get(ExpressDataApplication.name);
        expect(dataApplication.container).toBeTruthy();
        // add custom route
        dataApplication.container.get('/test/message', (req, res) => {
            return res.json({
                message: 'Hello World'
            });
        });
        const response = await request(app)
            .get('/test/message')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.message).toBe('Hello World');
    });

    it('should insert route', async ()=> {

        /**
         * @type {ExpressDataApplication}
         */
        const dataApplication = app.get(ExpressDataApplication.name);
        expect(dataApplication.container).toBeTruthy();

        // add custom route before serviceRouter
        dataApplication.container.get('/api/users/me/message', (req, res) => {
            return res.json({
                message: 'Hello World'
            });
        });
        // get app stack
        const stack = dataApplication.container._router.stack;
        // get last router
        const index = stack.length - 1;
        // get last route
        const route = stack[index];
        // remove last router
        stack.splice(index, 1);
        // insert last route before dataContextMiddleware
        const findIndex = stack.findIndex(item => {
            return item.name === 'dataContextMiddleware';
        });
        stack.splice(findIndex, 0, route);

        const response = await request(app)
            .get('/api/users/me/message')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.message).toBe('Hello World');

    });


    it('should multiple routes', async ()=> {

        /**
         * @type {ExpressDataApplication}
         */
        const dataApplication = app.get(ExpressDataApplication.name);
        expect(dataApplication.container).toBeTruthy();

        const newRouter = express.Router();

        newRouter.get('/custom/b', (req, res) => {
            return res.json({
                message: 'b'
            });
        });

        newRouter.get('/custom/c', (req, res) => {
            return res.json({
                message: 'c'
            });
        });

        // get app stack
        const stack = dataApplication.container._router.stack;
        // find dataContextMiddleware
        const findIndex = stack.findIndex(item => {
            return item.name === 'dataContextMiddleware';
        });
        // insert routes
        stack.splice(findIndex, 0, ...newRouter.stack);

        let response = await request(app)
            .get('/custom/b')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.message).toBe('b');

        response = await request(app)
            .get('/custom/c')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.message).toBe('c');

    });

});
