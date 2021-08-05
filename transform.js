/**
 * Mapping between GQL primitive types and JSON Schema property types
 *
 * @type       {<type>}
 */
const PRIMITIVES = {
  Int: "integer",
  Float: "number",
  String: "string",
  Boolean: "boolean",
  ID: "string",
};

/**
 * returns a JSON schema property type for a given GQL field type
 *
 * @param      {object}  type    The GQL type object
 * @return     {Object}  the property type object or a reference to a type definition
 */
const getPropertyType = (type) => {
  switch (type.kind) {
    case "NonNullType":
      return Object.assign(getPropertyType(type.type), { required: true });
    case "ListType":
      return {
        type: "array",
        items: {
          type: getPropertyType(type.type),
        },
      };
    default:
      if (type.name.value in PRIMITIVES) {
        return {
          type: PRIMITIVES[type.name.value],
          required: false,
        };
      } else {
        return { $ref: `#/definitions/${type.name.value}` };
      }
  }
};

/**
 * maps a GQL type field onto a JSON Schema property
 *
 * @param      {object}  field   The GQL field object
 * @return     {Object}  a plain JS object containing the property schema or a reference to another definition
 */
const toSchemaProperty = (field) => {
  let propertyType = getPropertyType(field.type);

  return Object.assign(propertyType, {
    title: field.name.value,
    arguments: field.arguments
      ? field.arguments.map((a) => {
          return {
            title: a.name.value,
            type: getPropertyType(a.type),
            defaultValue: a.defaultValue,
          };
        })
      : [],
  });
};

/**
 * Converts a single GQL definition into a plain JS schema object
 *
 * @param      {Object}  definition  The GQL definition object
 * @return     {Object}  A plain JS schema object
 */
const toSchemaObject = (definition) => {
  if (definition.kind === "ScalarTypeDefinition") {
    return {
      title: definition.name.value,
      type: "GRAPHQL_SCALAR",
    };
  } else if (definition.kind === "UnionTypeDefinition") {
    return {
      title: definition.name.value,
      type: "GRAPHQL_UNION",
      oneOf: definition.types.map(getPropertyType),
    };
  } else if (definition.kind === "EnumTypeDefinition") {
    return {
      title: definition.name.value,
      type: "GRAPHQL_ENUM",
      enum: definition.values.map((v) => v.name.value),
    };
  }

  const fields = definition.fields.map(toSchemaProperty);

  const properties = {};
  for (let f of fields) properties[f.title] = f;

  const required = fields.filter((f) => f.required).map((f) => f.title);

  return {
    title: definition.name.value,
    type: "object",
    properties,
    required,
  };
};

const typeToString = (type, typeDefs) => {
  if (!type.type) {
    for (const def of typeDefs) {
      if (def.title === type.name.value) {
        return `${def.type}${
          def.oneOf ? " (" + def.oneOf.join(", ") + ")" : ""
        }`;
      }
    }
    return type.name.value;
  }
  return `${type.kind} ${typeToString(type.type, typeDefs)}`;
};

const fieldToDummyObject = (field, typeDefs) => {
  if (field.fields?.length) {
    const subfields = field.fields
      .map((f) => {
        return fieldToDummyObject(f, typeDefs);
      })
      .reduce((obj, item) =>
        Object.assign(obj, {
          [Object.keys(item)[0]]: Object.values(item)[0],
        })
      );
    return { [field.name.value]: subfields };
  }
  const required = field.required ? " required" : "";
  return {
    [field.name.value]: `${typeToString(field.type, typeDefs)}${required}`,
  };
};

const getFields = (definition) => {
  if (definition.kind === "ScalarTypeDefinition") {
    return {
      title: definition.name.value,
      type: "SCALAR",
    };
  } else if (definition.kind === "UnionTypeDefinition") {
    return {
      title: definition.name.value,
      type: "UNION",
      oneOf: definition.types.map(getPropertyType),
    };
  } else if (definition.kind === "EnumTypeDefinition") {
    return {
      title: definition.name.value,
      type: "ENUM",
      oneOf: definition.values.map((v) => v.name.value),
    };
  } else if (definition.kind === "SchemaDefinition") {
    return {
      title: definition.kind,
      type: definition.kind,
    };
  }
  return { richType: true, definition };
};

const toJSONFactory = () => {
  return (definitions) => {
    const fields = definitions.map(getFields);
    const typeDefs = fields.filter((f) => !f.richType);
    const richTypes = fields.filter((f) => f.richType);
    return richTypes.map((type) =>
      fieldToDummyObject(type.definition, typeDefs)
    );
  };
};
/**
 * GQL -> JSON Schema transform
 *
 * @param      {Document}  document  The GraphQL document returned by the parse function of graphql/language
 * @return     {object}  A plain JavaScript object which conforms to JSON Schema
 */
const transform = (document) => {
  const definitions = document.definitions.map(toSchemaObject);

  const schema = {
    $schema: "http://json-schema.org/draft-04/schema#",
    definitions: {},
  };

  for (let def of definitions) {
    schema.definitions[def.title] = def;
  }
  // require('fs').writeFile('output.json', JSON.stringify(schema))
  return schema;
};

module.exports = {
  transform,
  toJSONFactory,
};
