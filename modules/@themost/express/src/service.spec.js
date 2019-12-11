import path from 'path';
import {ExpressDataApplication} from './app';
import request from 'supertest';
import express from 'express';
import BearerStrategy from 'passport-http-bearer';
import passport from 'passport';
import {serviceRouter} from './service';
import {dateReviver} from './helpers';
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

    it('should use an entity set function', async () => {
        // change user
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

    it('should get items with paging', async () => {
        // change user
        spyOn(passportStrategy, 'getUser').and.returnValue({
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
        expect(response.body.value).toBeInstanceOf(Array);
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
        expect(response.body.value).toBeInstanceOf(Array);
        expect(response.body['@odata.count']).toBeGreaterThan(10);
        expect(response.body['@odata.skip']).toBe(10);
        expect(response.body.value.length).toBe(10);
    });

    it('should use select query', async () => {
        // change user
        spyOn(passportStrategy, 'getUser').and.returnValue({
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
        expect(response.body.value).toBeInstanceOf(Array);
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
        expect(response.body.value).toBeInstanceOf(Array);
        response.body.value.forEach( x => {
            const keys = Object.keys(x);
            expect(keys).toContain('productModel');
        });
    });

    it('should use order by query', async () => {
        // change user
        spyOn(passportStrategy, 'getUser').and.returnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/products/')
            .query({
                $orderby: 'name asc'
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.value).toBeInstanceOf(Array);
        response.body.value.forEach( (x, i) => {
            if (i > 0) {
                expect(x.name).toBeGreaterThanOrEqual(response.body.value[i-1].name);
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
        expect(response1.body.value).toBeInstanceOf(Array);
        response1.body.value.forEach( (x, i) => {
            if (i > 0) {
                // noinspection JSUnresolvedVariable
                expect(x.price).toBeLessThanOrEqual(response1.body.value[i-1].price);
            }
        });
    });

    it('should use group by query', async () => {
        // change user
        spyOn(passportStrategy, 'getUser').and.returnValue({
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
        expect(response.body.value).toBeInstanceOf(Array);
        response.body.value.forEach( x => {
            const keys = Object.keys(x);
            expect(keys).toContain('category');
            expect(keys).toContain('count');
            expect(x.count).toBeGreaterThanOrEqual(0);
        });
    });

    it('should save a new product', async () => {
        const newProduct = {
            "category": "Laptops",
            "price": 1099,
            "model": "MQD32GR",
            "releaseDate": "2019-04-15 12:15:00.000+02:00",
            "name": "Apple MacBook Air 13 8GB/128GB",
        };
        // change user
        spyOn(passportStrategy, 'getUser').and.returnValue({
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
        spyOn(passportStrategy, 'getUser').and.returnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/people/')
            .query({
                $filter: `description eq 'Collin Jenkins'`
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.value).toBeInstanceOf(Array);
        expect(response.body.value.length).toBe(1);
        const person = response.body.value[0];
        response = await request(app)
            .get(`/api/people/${person.id}/orders`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.value).toBeInstanceOf(Array);
        response.body.value.forEach( x => {
            expect(x.additionalType).toBe('Order');
            expect(x).toBeTruthy();
        });
    });
    it('should query products with text', async () => {
        // change user
        spyOn(passportStrategy, 'getUser').and.returnValue({
            name: 'alexis.rees@example.com'
        });
        let response = await request(app)
            .get('/api/products/')
            .query({
                $search: `"Retina Display"`
            })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json');
        expect(response.status).toBe(200);
        expect(response.body).toBeTruthy();
        expect(response.body.value).toBeInstanceOf(Array);
    });

});