export interface ShareLinkRecord {
  testId: string;
  userId: string;
  prefix: string;
  createdAt: string;
}

export interface ShareLinkRepository {
  findByHash(hash: string): Promise<ShareLinkRecord | undefined>;
  findByTest(userId: string, testId: string): Promise<ShareLinkRecord | undefined>;
  save(hash: string, record: ShareLinkRecord): Promise<void>;
  removeByTest(userId: string, testId: string): Promise<void>;
}
