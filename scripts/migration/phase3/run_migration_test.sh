#!/bin/bash

# Phase 3-2: データマイグレーション実行スクリプト（テスト環境用）
# テストデータベースでの検証用

set -e  # エラーが発生したら即座に停止

# 設定
DB_HOST="localhost"
DB_PORT="15432"
DB_NAME="dojin_management_test"  # テスト用データベース
DB_USER="dojin_user"
export PGPASSWORD="dojin_password"

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Phase 3-2: データマイグレーション実行（テスト環境）${NC}"
echo -e "${YELLOW}========================================${NC}"

# 1. 初版Editionレコードの生成
echo -e "\n${GREEN}1. 初版Editionレコードの生成...${NC}"
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ./01_create_initial_editions.sql

# 2. ExhibitBookの版対応
echo -e "\n${GREEN}2. ExhibitBookの版対応...${NC}"
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ./02_migrate_exhibit_books.sql

# 3. データ整合性の確認
echo -e "\n${GREEN}3. データ整合性の確認...${NC}"
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ./03_verify_data_integrity.sql

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}テスト環境でのマイグレーションが完了しました！${NC}"
echo -e "${GREEN}========================================${NC}"