/* eslint-disable quotes */
const schema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "BatchRequestMessage",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "method": {
      "type": "string"
    },
    "url": {
      "type": "string",
      "$ref": "#/definitions/relativeUri"
    },
    "headers": {
      "type": "object",
      "additionalProperties": {
        "type": "string"
      }
    },
    "body": {},
    "atomicityGroup": {
      "type": "string"
    },
    "dependsOn": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "uniqueItems": true
    }
  },
  "required": [
    "id",
    "method",
    "url"
  ],
  "additionalProperties": false,
  "definitions": {
    "relativeUri": {
      "type": "string",
      "pattern": "^((?:https?:)?\/\/)",
      "title": "Relative URI",
      "description": "A relative URI that does not include the scheme and host. It may include query parameters and fragments."
    }
  }
}

export {
    schema
}