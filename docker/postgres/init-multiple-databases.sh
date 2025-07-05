#!/bin/bash
set -e

# PostgreSQL初期化スクリプト
# 開発用とテスト用のデータベースを自動作成

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	-- テスト用データベースの作成
	CREATE DATABASE dojin_management_test;
	GRANT ALL PRIVILEGES ON DATABASE dojin_management_test TO $POSTGRES_USER;
EOSQL

echo "データベースが正常に作成されました:"
echo "- 開発用: $POSTGRES_DB"
echo "- テスト用: dojin_management_test"