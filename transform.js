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
        return `${def.type} ${def.title}${
          def.oneOf ? " (" + def.oneOf.join(", ") + ")" : ""
        }`;
      }
    }
    return type.name.value;
  }
  return `${type.kind} ${typeToString(type.type, typeDefs)}`;
};

const findKnownType = (type, richTypes) => {
  if (!type.type) {
    for (const richType of richTypes) {
      if (richType.type === type.name.value) {
        return richType;
      }
    }
    return undefined;
  }
  return findKnownType(type.type, richTypes);
};

const fieldToObject = (field, typeDefs, richTypes, returnFieldName) => {
  if (field.fields?.length) {
    const subfields = field.fields
      .map((f) => {
        return fieldToObject(f, typeDefs, richTypes, true);
      })
      .reduce((obj, item) =>
        Object.assign(obj, {
          [Object.keys(item)[0]]: Object.values(item)[0],
        })
      );

    return returnFieldName ? { [field.name.value]: subfields } : subfields;
  }
  const fullTypeDef = typeToString(field.type, typeDefs);
  const knownType = findKnownType(field.type, richTypes);

  if (knownType?.definition?.kind) {
    const dataItem = fieldToObject(
      knownType.definition,
      typeDefs,
      richTypes,
      false
    );
    data = fullTypeDef.includes("ListType") ? [dataItem] : dataItem;
  } else if (fullTypeDef.includes("Int")) {
    data = 42;
  } else if (fullTypeDef.includes("Boolean")) {
    data = true;
  } else if (fullTypeDef.includes("Float")) {
    data = 0.42;
  } else {
    data = fullTypeDef;
  }

  if (returnFieldName) {
    return {
      [field.name.value]: data,
    };
  }
  return data;
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
  return { type: definition.name.value, richType: true, definition };
};

const toJSONFactory = () => {
  return (definitions) => {
    const fields = definitions.map(getFields);
    const typeDefs = fields.filter((f) => !f.richType);
    const richTypes = fields.filter((f) => f.richType);
    return richTypes
      .filter((type) => ["SunglassVariantInput"].includes(type.type))
      .map((type) => fieldToObject(type.definition, typeDefs, richTypes));
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
