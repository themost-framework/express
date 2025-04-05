import express from "express";
import {ExpressDataApplication} from "@themost/express";
import path from "path";
import {dateReviver} from "@themost/express";
import passport from "passport";
import {serviceRouter} from "@themost/express";
import {TestPassportStrategy} from "./passport";
import request from "supertest";

describe('EntitySetFunction', () => {
    let app;
    let passportStrategy = new TestPassportStrategy();
    beforeAll(() => {
        app = express();
        // create a new instance of data application
        const dataApplication = new ExpressDataApplication(path.resolve(__dirname, 'test/config'));
        app.use(express.json({
            reviver: dateReviver
        }));
        // hold data application
        app.set('ExpressDataApplication', dataApplication);
        // use data middleware (register req.context)
        app.use(dataApplication.middleware(app));
        // use test passport strategy
        // noinspection JSCheckFunctionSignatures
        passport.use(passportStrategy);
        // set testRouter
        // noinspection JSCheckFunctionSignatures
        app.use('/api/', passport.authenticate('bearer', { session: false }), serviceRouter);
    });

    it('should GET /api/users/me', async () => {
        spyOn(passportStrategy, 'getUser').and.returnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/users/me')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.name).toBe('alexis.rees@example.com');
    });

    it('should GET /api/users/active?name=?', async () => {
        spyOn(passportStrategy, 'getUser').and.returnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/users/active')
            .query({
                name: 'alexis.rees@example.com'
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.name).toBe('alexis.rees@example.com');
        response = await request(app)
            .get('/api/users/active')
            .query({
                name: 'missing.user@example.com'
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(204);

        response = await request(app)
            .get('/api/users/active')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(400);

    });

});
