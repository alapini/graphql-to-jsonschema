# graphql-to-jsonschema
[![](https://travis-ci.org/alapini/graphql-to-jsonschema.svg?branch=master)](https://travis-ci.org/alapini/graphql-to-jsonschema)

Converts GraphQL Schema Definition to JSONSchema  

This repo is a fork of [jakubfiala/graphql-json-schema](https://github.com/jakubfiala/graphql-json-schema) but [mozilla-services/react-jsonschema-form](https://github.com/mozilla-services/react-jsonschema-form) compatible.
## Installation

```shell
npm install graphql-to-json-schema
```

## Usage

```js
  const transform = require('graphql-to-json-schema');

  const schema = transform(`
    scalar Foo

    union MyUnion = Foo | String | Float

    enum MyEnum {
      FIRST_ITEM
      SECOND_ITEM
      THIRD_ITEM
    }

    type Stuff {
      my_field: Int
      req_field: String!
      recursion: MoreStuff
      custom_scalar: Foo
      enum: MyEnum
    }

    type MoreStuff {
      first: [Float]
      identifier: [ID]!
      reference: Stuff!
      bool: Boolean!
      union: MyUnion
      with_params(param1: Int, param2: [Float]): Int
    }
  `);

  console.log(schema);
```

The code above returns the following JSON as a plain JS object:

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "definitions": {
    "Foo": {
      "title": "Foo",
      "type": "GRAPHQL_SCALAR"
    },
    "MyUnion": {
      "title": "MyUnion",
      "type": "GRAPHQL_UNION",
      "oneOf": [
        {
          "$ref": "#/definitions/Foo"
        },
        {
          "type": "string",
          "required": false
        },
        {
          "type": "number",
          "required": false
        }
      ]
    },
    "MyEnum": {
      "title": "MyEnum",
      "type": "GRAPHQL_ENUM",
      "enum": [
        "FIRST_ITEM",
        "SECOND_ITEM",
        "THIRD_ITEM"
      ]
    },
    "Stuff": {
      "title": "Stuff",
      "type": "object",
      "properties": {
        "my_field": {
          "type": "integer",
          "required": false,
          "title": "my_field",
          "arguments": []
        },
        "req_field": {
          "type": "string",
          "required": true,
          "title": "req_field",
          "arguments": []
        },
        "recursion": {
          "$ref": "#/definitions/MoreStuff",
          "title": "recursion",
          "arguments": []
        },
        "custom_scalar": {
          "$ref": "#/definitions/Foo",
          "title": "custom_scalar",
          "arguments": []
        },
        "enum": {
          "$ref": "#/definitions/MyEnum",
          "title": "enum",
          "arguments": []
        }
      },
      "required": [
        "req_field"
      ]
    },
    "MoreStuff": {
      "title": "MoreStuff",
      "type": "object",
      "properties": {
        "first": {
          "type": "array",
          "items": {
            "type": {
              "type": "number",
              "required": false
            }
          },
          "title": "first",
          "arguments": []
        },
        "identifier": {
          "type": "array",
          "items": {
            "type": {
              "type": "string",
              "required": false
            }
          },
          "required": true,
          "title": "identifier",
          "arguments": []
        },
        "reference": {
          "$ref": "#/definitions/Stuff",
          "required": true,
          "title": "reference",
          "arguments": []
        },
        "bool": {
          "type": "boolean",
          "required": true,
          "title": "bool",
          "arguments": []
        },
        "union": {
          "$ref": "#/definitions/MyUnion",
          "title": "union",
          "arguments": []
        },
        "with_params": {
          "type": "integer",
          "required": false,
          "title": "with_params",
          "arguments": [
            {
              "title": "param1",
              "type": {
                "type": "integer",
                "required": false
              },
              "defaultValue": null
            },
            {
              "title": "param2",
              "type": {
                "type": "array",
                "items": {
                  "type": {
                    "type": "number",
                    "required": false
                  }
                }
              },
              "defaultValue": null
            }
          ]
        }
      },
      "required": [
        "identifier",
        "reference",
        "bool"
      ]
    }
  }
}
```
