import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, ListTablesCommand } from "@aws-sdk/client-dynamodb";

export const TEST_TABLE = "chorus-main-test";
const endpoint = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";

export const testDbClient = new DynamoDBClient({
  endpoint,
  region: "us-east-1",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

export async function createTestTable(): Promise<void> {
  const { TableNames } = await testDbClient.send(new ListTablesCommand({}));
  if (TableNames?.includes(TEST_TABLE)) return;

  await testDbClient.send(
    new CreateTableCommand({
      TableName: TEST_TABLE,
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
}

export async function deleteTestTable(): Promise<void> {
  const { TableNames } = await testDbClient.send(new ListTablesCommand({}));
  if (!TableNames?.includes(TEST_TABLE)) return;
  await testDbClient.send(new DeleteTableCommand({ TableName: TEST_TABLE }));
}
