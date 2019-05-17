"use strict";var _odata = require("@themost/data/odata");
var _dataObject = require("@themost/data/data-object");var _dec, _class;

/**
                                                                          * @class
                                                                          
                                                                          * @property {string} sameAs
                                                                          * @property {string} url
                                                                          * @property {string} image
                                                                          * @property {string} additionalType
                                                                          * @property {string} name
                                                                          * @property {string} identifier
                                                                          * @property {string} description
                                                                          * @property {string} disambiguatingDescription
                                                                          * @property {string} alternateName
                                                                          * @property {number} id
                                                                          * @property {Date} dateCreated
                                                                          * @property {Date} dateModified
                                                                          * @property {number} createdBy
                                                                          * @property {number} modifiedBy
                                                                          * @augments {DataObject}
                                                                          */let

Thing = (_dec = _odata.EdmMapping.entityType('Thing'), _dec(_class = class Thing extends _dataObject.DataObject {
  /**
                                                                                                                  * @constructor
                                                                                                                  */
  constructor() {
    super();
  }}) || _class);

module.exports = Thing;
//# sourceMappingURL=thing-model.js.map