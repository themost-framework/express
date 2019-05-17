import request from 'supertest';
import {assert} from 'chai';
import app from '../app';
describe('Test Entity Navigation Property', () => {
   it('GET /api/users/me', (done) => {
    request(app)
      .get('/api/users/me')
      .auth('alexis.rees@example.com', 'secret')
      .set('Accept', 'application/json')
      //.expect('Content-Type', /json/)
      .expect(200, (err, response) => {
          if (err) {
              return done(err);
          }
          assert.isObject(response.body);
          assert.equal(response.body.name, 'alexis.rees@example.com');
          return done();
      });
  });
  it('GET /api/orders/12/orderStatus', (done) => {
    request(app)
      .get('/api/orders/12/orderStatus')
      .auth('alexis.rees@example.com', 'secret')
      .set('Accept', 'application/json')
      //.expect('Content-Type', /json/)
      .expect(200, (err, response) => {
          if (err) {
              return done(err);
          }
          assert.isObject(response.body);
          assert.equal(response.body.additionalType, 'OrderStatusType');
          return done();
      });
  });
  it('GET /api/orders/$filter=customer/email eq \'lily.stewart@example.com\'', (done) => {
    request(app)
      .get('/api/orders/')
      .query({
          $filter: 'customer/email eq \'lily.stewart@example.com\''
      })
      .auth('alexis.rees@example.com', 'secret')
      .set('Accept', 'application/json')
      //.expect('Content-Type', /json/)
      .expect(200, (err, response) => {
          if (err) {
              return done(err);
          }
          assert.isObject(response.body);
          return done();
      });
  });
  
  
  it('GET /api/orders/648/orderStatus?$select=id,name', (done) => {
    request(app)
      .get('/api/orders/648/orderStatus')
      .query({
          $select: 'id,name'
      })
      .auth('alexis.rees@example.com', 'secret')
      .set('Accept', 'application/json')
      //.expect('Content-Type', /json/)
      .expect(200, (err, response) => {
          if (err) {
              return done(err);
          }
          assert.isObject(response.body);
          assert.isUndefined(response.body.additionalType, 'additionalType is defined');
          return done();
      });
  });
  it('GET /api/orders/648/customer', (done) => {
    request(app)
      .get('/api/orders/648/customer')
      .query()
      .auth('alexis.rees@example.com', 'secret')
      .set('Accept', 'application/json')
      //.expect('Content-Type', /json/)
      .expect(200, (err, response) => {
          if (err) {
              return done(err);
          }
          assert.isObject(response.body);
          assert.isNumber(response.body.user);
          return done();
      });
  });
  it('GET /api/orders/648/customer?$expand=user', (done) => {
    request(app)
      .get('/api/orders/648/customer')
      .query({
          $expand: 'user'
      })
      .auth('alexis.rees@example.com', 'secret')
      .set('Accept', 'application/json')
      //.expect('Content-Type', /json/)
      .expect(200, (err, response) => {
          if (err) {
              return done(err);
          }
          assert.isObject(response.body);
          assert.isObject(response.body.user);
          return done();
      });
  });
});
