import path from 'path';
import {ApplicationServiceRouter, ExpressDataApplication} from '@themost/express';
import request from 'supertest';
import express from 'express';
import BearerStrategy from 'passport-http-bearer';
import passport from 'passport';
import {serviceRouter, getServiceRouter} from '@themost/express';
import {dateReviver} from '@themost/express';
import { ApplicationService } from '@themost/common';
import { finalizeDataApplication } from './utils';

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
        // noinspection JSUnusedLocalSymbols
        return self._verify(req, null, ()=> {
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
        app.use(express.json({
            reviver: dateReviver
        }));
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

    afterAll(async () => {
        const service = app.get('ExpressDataApplication')
        await finalizeDataApplication(service);
    });

    it('should GET /api/users/', async () => {
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/users/')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
    });


    it('should find service router', async () => {
        const router = getServiceRouter(app);
        expect(router).toBeTruthy();
        expect(router.use).toBeInstanceOf(Function);
        const addRoute = express.Router();
        addRoute.get('/:entitySet', function customMiddleware(req, res, next) {
            res.set('X-Custom-Header', 'Custom')
            return next();
        });
        router.stack.unshift(...addRoute.stack);
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/users/')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toEqual(200);
        expect(response.get('X-Custom-Header')).toEqual('Custom');
    });

    it('should customize service router and set default query option', async () => {
        const router = getServiceRouter(app);
        expect(router).toBeTruthy();
        expect(router.use).toBeInstanceOf(Function);
        const addRoute = express.Router();
        addRoute.get('/:entitySet', function customMiddleware(req, res, next) {
            if (Object.prototype.hasOwnProperty.call(req.query, '$top') === false) {
                Object.assign(req.query, { $top: 10 });
            }
            return next();
        });
        router.stack.unshift(...addRoute.stack);
        jest.spyOn(passportStrategy, 'getUser', null).mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/users/')
            .query({
                $top: 10
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toEqual(200);
        expect(response.body).toBeTruthy();
        expect(Array.isArray(response.body.value)).toBeTruthy();
        expect(response.body.value.length).toEqual(10);

        response = await request(app)
            .get('/api/users/')
            .query({
                $top: 20
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toEqual(200);
        expect(response.body).toBeTruthy();
        expect(response.body.value).toBeInstanceOf(Array);
        expect(response.body.value.length).toEqual(20);
    });

    it('should use an entity set function', async () => {
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
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

    it('should get items with paging', async () => {
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/products/')
            .query({
                $top: 10
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.value).toBeTruthy();
        expect(Array.isArray(response.body.value)).toBeTruthy();
        expect(response.body.value.length).toBe(10);
        response = await request(app)
            .get('/api/products/')
            .query({
                $top: 10,
                $skip: 10,
                $count: true
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.value)).toBeTruthy();
        expect(response.body['@odata.count']).toBeGreaterThan(10);
        expect(response.body['@odata.skip']).toBe(10);
        expect(response.body.value.length).toBe(10);
    });

    it('should use select query', async () => {
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/products/')
            .query({
                $select: 'name,model,price'
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(Array.isArray(response.body.value)).toBeTruthy();
        response.body.value.forEach( x => {
            const keys = Object.keys(x);
            expect(keys).toContain('name');
            expect(keys).toContain('price');
            expect(keys).not.toContain('category');
        });
        response = await request(app)
            .get('/api/products/')
            .query({
                $select: 'name,model as productModel,price'
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(Array.isArray(response.body.value)).toBeTruthy();
        response.body.value.forEach( x => {
            const keys = Object.keys(x);
            expect(keys).toContain('productModel');
        });
    });

    it('should use order by query', async () => {
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/products/')
            .query({
                $orderby: 'name asc',
                $top: 5
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(Array.isArray(response.body.value)).toBeTruthy();
        response.body.value.forEach( (x, i) => {
            if (i > 0) {
                const {name} = x;
                const previous = response.body.value[i-1].name;
                expect(name > previous).toBeTruthy();
            }
        });

        let response1 = await request(app)
            .get('/api/products/')
            .query({
                $orderby: 'price desc'
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response1.status).toBe(200);
        expect(response1.body).toBeTruthy();
        expect(Array.isArray(response1.body.value)).toBeTruthy();
        response1.body.value.forEach( (x, i) => {
            if (i > 0) {
                // noinspection JSUnresolvedVariable
                expect(x.price).toBeLessThanOrEqual(response1.body.value[i-1].price);
            }
        });
    });

    it('should use group by query', async () => {
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/products/')
            .query({
                $select: 'category, count(id) as count',
                $groupby: 'category'
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(Array.isArray(response.body.value)).toBeTruthy();
        response.body.value.forEach( x => {
            const keys = Object.keys(x);
            expect(keys).toContain('category');
            expect(keys).toContain('count');
            expect(x.count).toBeGreaterThanOrEqual(0);
        });
    });

    it('should save a new product', async () => {
        const newProduct = {
            'category': 'Laptops',
            'price': 1099,
            'model': 'MQD32GR',
            'releaseDate': '2019-04-15 12:15:00.000+02:00',
            'name': 'Apple MacBook Air 13 8GB/128GB',
        };
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .post('/api/products/')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send(newProduct);
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.id).toBeTruthy();
        Object.assign(newProduct, response.body);
        response = await request(app)
            .get('/api/products/')
            .query({
                $filter: `id eq ${newProduct.id}`
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.value).toBeInstanceOf(Array);
        expect(response.body.value.length).toBe(1);
        // prepare to delete
        response = await request(app)
            .delete('/api/products/')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send(newProduct);
        expect(response.status).toBe(200);

        response = await request(app)
            .get('/api/products/')
            .query({
                $filter: `id eq ${newProduct.id}`
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body.value).toBeInstanceOf(Array);
        expect(response.body.value.length).toBe(0);
    });

    it('should get navigation property', async () => {
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/people/')
            .query({
                $filter: 'description eq \'Collin Jenkins\''
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(Array.isArray(response.body.value)).toBeTruthy();
        expect(response.body.value.length).toBe(1);
        const person = response.body.value[0];
        response = await request(app)
            .get(`/api/people/${person.id}/orders`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(Array.isArray(response.body.value)).toBeTruthy();
        response.body.value.forEach( x => {
            expect(x.additionalType).toBe('Order');
            expect(x).toBeTruthy();
        });
    });
    it('should query products with text', async () => {
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/products/')
            .query({
                $search: '"Retina Display"'
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(Array.isArray(response.body.value)).toBeTruthy();
    });

    it('should insert one route', async ()=> {

        /**
         * @type {ExpressDataApplication}
         */
        const dataApplication = app.get(ExpressDataApplication.name);
        expect(dataApplication.container).toBeTruthy();

        /**
         * get application service router
         * @type {e.Router}
         */
        const serviceRouter = dataApplication.getService(ApplicationServiceRouter).serviceRouter;

        // add custom route before serviceRouter
        serviceRouter.get('/users/me/a', (req, res) => {
            return res.json({
                message: 'a custom route'
            });
        });

        (function moveLastRoute(router){
            // get app stack
            const stack = router.stack;
            // get last router
            const index = stack.length - 1;
            // get last route
            const route = stack[index];
            // remove last router
            stack.splice(index, 1);
            // move up
            stack.unshift(route);
        })(serviceRouter);

        const response = await request(app)
            .get('/api/users/me/a')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.message).toBe('a custom route');
    });

    it('should insert multiple routes', async ()=> {

        /**
         * @type {ExpressDataApplication}
         */
        const dataApplication = app.get(ExpressDataApplication.name);
        expect(dataApplication.container).toBeTruthy();

        /**
         * get application service router
         * @type {e.Router}
         */
        const serviceRouter = dataApplication.getService(ApplicationServiceRouter).serviceRouter;

        const newRouter = express.Router();
        // add custom route before serviceRouter
        newRouter.get('/users/me/b', (req, res) => {
            expect(req.context).toBeTruthy();
            return res.json({
                message: 'b'
            });
        });

        newRouter.get('/users/me/c', (req, res) => {
            expect(req.context).toBeTruthy();
            return res.json({
                message: 'c'
            });
        });

        // add routes
        serviceRouter.stack.unshift.apply(serviceRouter.stack, newRouter.stack);

        let response = await request(app)
            .get('/api/users/me/b')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.message).toBe('b');

        response = await request(app)
            .get('/api/users/me/c')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.message).toBe('c');

        // finally get user
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        response = await request(app)
            .get('/api/users/me')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.name).toBe('alexis.rees@example.com');

    });

    it('should extend service router', async () => {

        const app1 = express();
        // create a new instance of data application
        const application = new ExpressDataApplication(path.resolve(__dirname, 'test/config'));
        // use extension
        application.useService(ServiceRouterExtension);
        app1.use(express.json({
            reviver: dateReviver
        }));
        // hold data application
        app1.set('ExpressDataApplication', application);
        // use data middleware (register req.context)
        app1.use(application.middleware(app1));
        // use test passport strategy
        passport.use(passportStrategy);
        // set service router
        app1.use('/api/', passport.authenticate('bearer', { session: false }), serviceRouter);

        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app1)
            .get('/api/users/me/status')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.status).toBe('ok');
        await finalizeDataApplication(application);

    });

    it('should use stream formatter', async () => {

        const app1 = express();
        // create a new instance of data application
        const application = new ExpressDataApplication(path.resolve(__dirname, 'test/config'));

        app1.use(express.json({
            reviver: dateReviver
        }));
        // hold data application
        app1.set('ExpressDataApplication', application);
        // use data middleware (register req.context)
        app1.use(application.middleware(app1));
        // use test passport strategy
        passport.use(passportStrategy);
        // set service router
        app1.use('/api/', passport.authenticate('bearer', { session: false }), serviceRouter);

        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app1)
            .get('/api/users/me/avatar')
            .set('Accept', 'image/png');
        expect(response.status).toBe(200);
        expect(response.type).toBe('image/png');
        expect(response.body).toBeInstanceOf(Buffer);

        response = await request(app1)
            .post('/api/users/me/anotherAvatar')
            .set('Accept', 'image/png');
        expect(response.status).toBe(200);
        expect(response.type).toBe('application/octet-stream');
        expect(response.body).toBeInstanceOf(Buffer);
        expect(response.get('content-location')).toBe('/another/avatar/location');
        await finalizeDataApplication(application);

    });

    it('should post file', async () => {
        const app1 = express();
        // create a new instance of data application
        const application = new ExpressDataApplication(path.resolve(__dirname, 'test/config'));

        app1.use(express.json({
            reviver: dateReviver
        }));
        // hold data application
        app1.set('ExpressDataApplication', application);
        // use data middleware (register req.context)
        app1.use(application.middleware(app1));
        // use test passport strategy
        passport.use(passportStrategy);
        // set service router
        app1.use('/api/', passport.authenticate('bearer', { session: false }), serviceRouter);
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });

        let response = await request(app1)
            .post('/api/users/me/uploadAvatar')
            .field('alternateName', 'testing')
            .field('published', true)
            .attach('file', path.resolve(__dirname, 'test/models/avatars/avatar1.png'))
        expect(response.status).toBe(200);
        expect(response.body.dateCreated).toBeTruthy();

        response = await request(app1)
            .post('/api/users/me/uploadAvatar')
            .field('alternateName', 'testing')
            .field('published', true)
        expect(response.status).toBe(400);
        await finalizeDataApplication(application);

    });

    it('should post file that exceeds file limit', async () => {
        const app1 = express();
        // create a new instance of data application
        const application = new ExpressDataApplication(path.resolve(__dirname, 'test/config'));

        app1.use(express.json({
            reviver: dateReviver
        }));
        // hold data application
        app1.set('ExpressDataApplication', application);
        // use data middleware (register req.context)
        app1.use(application.middleware(app1));
        // use test passport strategy
        passport.use(passportStrategy);
        // set service router
        app1.use('/api/', passport.authenticate('bearer', { session: false }), serviceRouter);
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });

        application.getConfiguration().setSourceAt('settings/multer', {
           limits: {
            fileSize: 100
           }
        });

        let response = await request(app1)    
            .post('/api/users/me/uploadAvatar')
            .field('alternateName', 'testing')
            .field('published', true)
            .attach('file', path.resolve(__dirname, 'test/models/avatars/avatar1.png'))
        expect(response.status).toBe(500);
        expect(response.text.includes('File too large')).toBeTruthy();

        application.getConfiguration().setSourceAt('settings/multer', {
            limits: {
             fileSize: 2000000
            }
         });

         response = await request(app1)    
            .post('/api/users/me/uploadAvatar')
            .field('alternateName', 'testing')
            .field('published', true)
            .attach('file', path.resolve(__dirname, 'test/models/avatars/avatar1.png'))
        expect(response.status).toBe(200);
        await finalizeDataApplication(application);

    });

    it('should post file for entity set action', async () => {
        const app1 = express();
        // create a new instance of data application
        const application = new ExpressDataApplication(path.resolve(__dirname, 'test/config'));

        app1.use(express.json({
            reviver: dateReviver
        }));
        // hold data application
        app1.set('ExpressDataApplication', application);
        // use data middleware (register req.context)
        app1.use(application.middleware(app1));
        // use test passport strategy
        passport.use(passportStrategy);
        // set service router
        app1.use('/api/', passport.authenticate('bearer', { session: false }), serviceRouter);
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });

        const response = await request(app1)
            .post('/api/users/uploadTestAvatar')
            .field('alternateName', 'testing')
            .field('published', true)
            .attach('file', path.resolve(__dirname, 'test/models/avatars/avatar1.png'))
        expect(response.status).toEqual(200);
        expect(response.body.dateCreated).toBeTruthy();
        await finalizeDataApplication(application);
    });


    it('should use an entity function and return no content', async () => {
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/users/me/emptyContent')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(204);

        response = await request(app)
            .get('/api/users/staticEmptyContent')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(204);
    });

    it('should use an entity action and return no content', async () => {
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .post('/api/users/me/emptyContent')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                message: 'Hello'
            });
        expect(response.status).toBe(204);

        response = await request(app)
            .post('/api/users/staticEmptyContent')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                message: 'Hello'
            });
        expect(response.status).toBe(204);

    });

    it('should use an entity function and return queryable no content', async () => {
        // change user
        jest.spyOn(passportStrategy, 'getUser').mockReturnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/users/me/emptyPerson?$select=id,givenName,familyName')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(204);

        response = await request(app)
            .get('/api/users/me/queryEmptyPerson?$select=id,givenName,familyName')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(204);

        response = await request(app)
            .get('/api/users/staticEmptyPerson?$select=id,givenName,familyName')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(204);

        response = await request(app)
            .get('/api/users/staticEmptyPerson/orders')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(404);

        response = await request(app)
            .get('/api/users/staticQueryEmptyPerson?$select=id,givenName,familyName')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(204);

        response = await request(app)
            .get('/api/users/staticQueryEmptyPerson/orders')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(404);

    });




});
