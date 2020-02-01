import path from 'path';
import {ExpressDataApplication} from './index';
import request from 'supertest';
import express from 'express';
import passport from 'passport';
import {TestPassportStrategy} from './passport.spec';
import {ResponseFormatter} from './formatter';
describe('ResponseFormatter', () => {
   
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
        passport.use(passportStrategy);
        // set testRouter
        app.use('/', passport.authenticate('bearer', { session: false }), testRouter);
        
    });

    it('should create instance', async () => {
        const reponseFormatter = new ResponseFormatter(app.get(ExpressDataApplication.name));
        expect(reponseFormatter).toBeTruthy();
    });

    it('should get formatter instance', async () => {
        const reponseFormatter = new ResponseFormatter(app.get(ExpressDataApplication.name));
        expect(reponseFormatter.for({
            message: 'hey'
        })).toBeTruthy();
    });

    it('should use formatter to get json', async () => {

        testRouter.get('/message', (req, res, next) => {
            const responseFormatter = new ResponseFormatter(app.get(ExpressDataApplication.name));
            res.format(responseFormatter.for({
                message: 'hey'
            }, req, res, next));
        });

        let response = await request(app)
            .get('/message')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body).toEqual({
            message: 'hey'
        });

        response = await request(app)
            .get('/message')
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body).toEqual({
            message: 'hey'
        });
    });

    it('should use formatter to get xml', async () => {

        testRouter.get('/message', (req, res, next) => {
            const reponseFormatter = new ResponseFormatter(app.get(ExpressDataApplication.name));
            res.format(reponseFormatter.for({
                message: 'hey'
            }, req, res, next));
        });

        let response = await request(app)
            .get('/message')
            .set('Accept', 'application/xml');
        expect(response.status).toBe(200);
        expect(response.text).toBeTruthy();
        expect(response.text).toBe(`<Object><message>hey</message></Object>`);
    });
    
});