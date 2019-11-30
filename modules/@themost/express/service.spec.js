const path = require('path');
const ExpressDataApplication = require('./app').ExpressDataApplication;
const request = require('supertest');
const express = require('express');
const { HttpNotFoundError } = require('@themost/common');
const BearerStrategy = require('passport-http-bearer');
const passport = require('passport');
const serviceRouter = require('./service');
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
    authenticate(req) {
        const self = this;
        return self._verify(req, null, (user)=> {
            return self.success(self.getUser());
        });
    }
}

describe('serviceRouter', () => {
    /**
     * express application for testing
     * @type {*|Express}
     */
    let app;

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
        passport.use(passportStrategy);
        // set testRouter
        app.use('/api/', passport.authenticate('bearer', { session: false }), serviceRouter);
    });

    beforeEach(() => {
        //
    });

    it('should GET /api/users/', async () => {
        // change user
        spyOn(passportStrategy, 'getUser').and.returnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/users/')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
    });

});
