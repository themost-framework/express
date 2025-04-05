const {TraceUtils} = require('@themost/common');
const {JsonLogger} = require('@themost/json-logger');
// noinspection JSCheckFunctionSignatures
TraceUtils.useLogger(new JsonLogger());
jest.setTimeout(15000);