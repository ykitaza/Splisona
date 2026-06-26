import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from "@aws-sdk/client-dynamodb";

const endpoint = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";
const client = new DynamoDBClient({
  endpoint,
  region: "us-east-1",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

async function main() {
  const { TableNames } = await client.send(new ListTablesCommand({}));
  if (TableNames?.includes("chorus-main")) {
    console.log("Table 'chorus-main' already exists.");
    return;
  }

  await client.send(
    new CreateTableCommand({
      TableName: "chorus-main",
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: "S" },
        { AttributeName: "SK", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
    })
  );

  console.log("Table 'chorus-main' created.");
}

main().catch(console.error);
