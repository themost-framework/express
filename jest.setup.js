const {TraceUtils} = require('@themost/common');
const {JsonLogger} = require('@themost/json-logger');
// noinspection JSCheckFunctionSignatures
TraceUtils.useLogger(new JsonLogger());
/* global jest */
jest.setTimeout(60000);