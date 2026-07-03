import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

export function createDynamoClient(): DynamoDBDocumentClient {
  const isLocal = process.env.DYNAMODB_ENDPOINT !== undefined;
  const client = new DynamoDBClient(
    isLocal
      ? {
          endpoint: process.env.DYNAMODB_ENDPOINT,
          region: "us-east-1",
          credentials: { accessKeyId: "local", secretAccessKey: "local" },
        }
      : {}
  );
  return DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
}

export class DynamoOperations {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async getItem<T>(key: Record<string, string>): Promise<T | undefined> {
    const res = await this.client.send(new GetCommand({ TableName: this.tableName, Key: key }));
    return res.Item as T | undefined;
  }

  async putItem(item: Record<string, unknown>): Promise<void> {
    await this.client.send(new PutCommand({ TableName: this.tableName, Item: item }));
  }

  async deleteItem(key: Record<string, string>): Promise<void> {
    await this.client.send(new DeleteCommand({ TableName: this.tableName, Key: key }));
  }

  async queryByPK<T>(pk: string, skPrefix?: string): Promise<T[]> {
    const res = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: skPrefix
          ? "PK = :pk AND begins_with(SK, :skp)"
          : "PK = :pk",
        ExpressionAttributeValues: skPrefix
          ? { ":pk": pk, ":skp": skPrefix }
          : { ":pk": pk },
      })
    );
    return (res.Items ?? []) as T[];
  }
}
