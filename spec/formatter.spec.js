import path from 'path';
import {ExpressDataApplication} from '@themost/express';
import request from 'supertest';
import express from 'express';
import passport from 'passport';
import {TestPassportStrategy} from './passport';
import {JsonResponseFormatter, ResponseFormatter, XmlResponseFormatter} from '@themost/express';
import { finalizeDataApplication } from './utils';
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
        // noinspection JSCheckFunctionSignatures
        passport.use(passportStrategy);
        // set testRouter
        // noinspection JSCheckFunctionSignatures
        app.use('/', passport.authenticate('bearer', { session: false }), testRouter);
        
    });

    afterAll(async () => {
        const dataApplication = app.get('ExpressDataApplication');
        await finalizeDataApplication(dataApplication);
    });

    it('should create instance', async () => {
        const responseFormatter = new ResponseFormatter(app.get(ExpressDataApplication.name));
        expect(responseFormatter).toBeTruthy();
    });

    it('should get formatter instance', async () => {
        const responseFormatter = new ResponseFormatter(app.get(ExpressDataApplication.name));
        expect(responseFormatter.format({
            message: 'hey'
        })).toBeTruthy();
    });

    it('should use formatter to get json', async () => {

        testRouter.get('/message', (req, res) => {
            const responseFormatter = new ResponseFormatter(app.get(ExpressDataApplication.name));
            res.format(responseFormatter.format({
                message: 'hey'
            }).for(req, res));
        });

        let response = await request(app)
            .get('/message')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.message).toEqual('hey');

        response = await request(app)
            .get('/message')
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.message).toEqual('hey');
    });

    it('should use formatter to get xml', async () => {

        const responseFormatter = new ResponseFormatter(app.get(ExpressDataApplication.name));
        responseFormatter.formatters.set('application/xml', XmlResponseFormatter);
        testRouter.get('/newMessage', (req, res) => {
            res.format(responseFormatter.format({
                message: 'hey'
            }).for(req, res));
        });

        let response = await request(app)
            .get('/newMessage')
            .set('Accept', 'application/xml');
        expect(response.status).toBe(200);
        expect(response.text).toBeTruthy();
        expect(response.text).toBe('<Object><message>hey</message></Object>');
    });

    it('should return 204 no content', async () => {

        const responseFormatter = new ResponseFormatter(app.get(ExpressDataApplication.name));
        responseFormatter.formatters.set('application/xml', XmlResponseFormatter);
        testRouter.get('/no-xml-content', (req, res) => {
            res.format(responseFormatter.format(null).for(req, res));
        });

        let response = await request(app)
            .get('/no-xml-content')
            .set('Accept', 'application/xml');
        expect(response.status).toBe(204);

        responseFormatter.formatters.set('application/json', JsonResponseFormatter);
        testRouter.get('/no-json-content', (req, res) => {
            res.format(responseFormatter.format(null).for(req, res));
        });

        response = await request(app)
            .get('/no-json-content')
            .set('Accept', 'application/json');
        expect(response.status).toBe(204);

    });
    
});
