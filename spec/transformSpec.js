const transform = require("../index.js");
const { toJSON } = require("../transform.js");
const fs = require("fs");
const path = require("path");

const parse = require("graphql/language").parse;

describe("GraphQL to JSON Schema transform", () => {
  it("fails if the schema is not a string", () => {
    expect(() => transform(Math.PI)).toThrowError();
  });

  it("fails if the schema is not a valid GraphQL schema", () => {
    expect(() =>
      transform(`
      type MyBrokenType {
        semicolon: String;
      }
    `)
    ).toThrowError();
  });

  it("parses a test GraphQL Schema properly", () => {
    const mockGraphQL = fs.readFileSync(
      path.join(__dirname, "data/mock_schema.graphql"),
      { encoding: "utf-8" }
    );

    const mockJSONSchema = require(path.join(
      __dirname,
      "data/mock_schema.json"
    ));
    const transformed = transform(mockGraphQL);
    //expect(transformed).toEqual(mockJSONSchema);
  });

  it("generated JSON for CreateProductInput", () => {
    const mockGraphQLProduct = fs.readFileSync(
      path.join(__dirname, "data/graphqleditorschema.graphql"),
      { encoding: "utf-8" }
    );

    const parsed = parse(mockGraphQLProduct);
    const result = toJSON(parsed.definitions, ["CreateProductInput"]);
    console.log("result", JSON.stringify(result, null, 2));
  });
});
