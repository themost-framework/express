"use strict";var _odata = require("@themost/data/odata");
var _dataObject = require("@themost/data/data-object");var _dec, _class;
let Thing = require('./thing-model');
/**
                                       * @class
                                       
                                       * @property {number} id
                                       * @augments {DataObject}
                                       */let

Account = (_dec = _odata.EdmMapping.entityType('Account'), _dec(_class = class Account extends Thing {
  /**
                                                                                                       * @constructor
                                                                                                       */
  constructor() {
    super();
  }}) || _class);

module.exports = Account;
//# sourceMappingURL=account-model.js.map