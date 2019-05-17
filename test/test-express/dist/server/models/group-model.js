"use strict";var _odata = require("@themost/data/odata");
var _dataObject = require("@themost/data/data-object");var _dec, _class;
let Account = require('./account-model');
/**
                                           * @class
                                           
                                           * @property {Array<Account|any>} members
                                           * @property {number} id
                                           * @augments {DataObject}
                                           */let

Group = (_dec = _odata.EdmMapping.entityType('Group'), _dec(_class = class Group extends Account {
  /**
                                                                                                   * @constructor
                                                                                                   */
  constructor() {
    super();
  }}) || _class);

module.exports = Group;
//# sourceMappingURL=group-model.js.map