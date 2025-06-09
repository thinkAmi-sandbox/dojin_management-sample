import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, beforeAll, afterAll, afterEach, it, expect } from 'vitest';
import { AppModule } from '../../../src/app.module';
import { PrismaClient } from '../../../generated/prisma';

describe('GET /books', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = new PrismaClient();
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await prisma.book.deleteMany();
  });

  it('書籍が存在する場合、全件を一覧表示する', async () => {
    // Arrange: テストデータを作成
    await prisma.book.createMany({
      data: [
        {
          title: 'NestJS入門',
          subtitle: '基礎編',
          description: 'NestJSの基本を学ぶ',
          pageCount: 100,
        },
        {
          title: 'TypeScript実践',
          subtitle: null,
          description: '型安全な開発手法',
          pageCount: 200,
        },
        {
          title: 'Vitest完全ガイド',
          subtitle: 'テスト駆動開発',
          description: null,
          pageCount: 150,
        },
      ],
    });

    // Act: GET /booksにリクエスト
    const response = await request(app.getHttpServer())
      .get('/books')
      .expect(200)
      .expect('Content-Type', /html/);

    // Assert: HTMLに書籍情報が含まれることを確認
    expect(response.text).toContain('NestJS入門');
    expect(response.text).toContain('基礎編');
    expect(response.text).toContain('NestJSの基本を学ぶ');
    expect(response.text).toContain('TypeScript実践');
    expect(response.text).toContain('型安全な開発手法');
    expect(response.text).toContain('Vitest完全ガイド');
    expect(response.text).toContain('テスト駆動開発');
  });

  it('書籍が存在しない場合、空の一覧を表示する', async () => {
    // Act: GET /booksにリクエスト（データベースは空）
    const response = await request(app.getHttpServer())
      .get('/books')
      .expect(200)
      .expect('Content-Type', /html/);

    // Assert: 書籍が登録されていないメッセージまたは空のリスト表示を確認
    // 実装によって以下のいずれかを確認
    expect(response.text).toMatch(/書籍が登録されていません|登録された書籍はありません|No books found/);
  });

  it('HTMLの基本構造が正しいことを確認する', async () => {
    // Act: GET /booksにリクエスト
    const response = await request(app.getHttpServer())
      .get('/books')
      .expect(200)
      .expect('Content-Type', /html/);

    // Assert: 基本的なHTML構造を確認
    expect(response.text).toContain('<!DOCTYPE html>');
    expect(response.text).toContain('<html');
    expect(response.text).toContain('</html>');
    expect(response.text).toMatch(/<title>.*書籍.*<\/title>/i);
  });
});