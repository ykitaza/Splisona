export interface ApiKeyRecord {
  keyId: string;
  userId: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface ApiKeyRepository {
  findByHash(hash: string): Promise<ApiKeyRecord | undefined>;
  listByUser(userId: string): Promise<ApiKeyRecord[]>;
  save(hash: string, record: ApiKeyRecord): Promise<void>;
  remove(userId: string, keyId: string): Promise<void>;
  touchLastUsed(hash: string, iso: string): Promise<void>;
}
