"use strict";var _supertest = _interopRequireDefault(require("supertest"));
var _chai = require("chai");
var _app = _interopRequireDefault(require("../app"));
var _common = require("@themost/common");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
describe('Test Entity Navigation Property', () => {
  it('GET /api/users/me', done => {
    (0, _supertest.default)(_app.default).
    get('/api/users/me').
    auth('alexis.rees@example.com', 'user').
    set('Accept', 'application/json')
    //.expect('Content-Type', /json/)
    .expect(200, (err, response) => {
      if (err) {
        return done(err);
      }
      console.log('INFO', response.body);
      return done();
    });
  });
});
//# sourceMappingURL=test-navigation-property.spec.js.map