import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME ?? "chorus-main";

function createClient(): DynamoDBDocumentClient {
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
  return DynamoDBDocumentClient.from(client);
}

export const docClient = createClient();

export function userKey(userId: string) {
  return { PK: `USER#${userId}`, SK: `USER#${userId}` } as const;
}

export function personaKey(userId: string, personaId: string) {
  return { PK: `USER#${userId}`, SK: `PERSONA#${personaId}` } as const;
}

export function abtestKey(userId: string, testId: string) {
  return { PK: `USER#${userId}`, SK: `ABTEST#${testId}` } as const;
}

export function evaluationKey(testId: string, personaId: string) {
  return { PK: `ABTEST#${testId}`, SK: `EVAL#${personaId}` } as const;
}

export function settingsKey(userId: string, section: string) {
  return { PK: `USER#${userId}`, SK: `SETTINGS#${section}` } as const;
}

export async function getItem<T>(key: Record<string, string>): Promise<T | undefined> {
  const res = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: key }));
  return res.Item as T | undefined;
}

export async function putItem(item: Record<string, unknown>): Promise<void> {
  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
}

export async function deleteItem(key: Record<string, string>): Promise<void> {
  await docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: key }));
}

export async function queryByPK<T>(pk: string, skPrefix?: string): Promise<T[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
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
