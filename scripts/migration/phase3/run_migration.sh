#!/bin/bash

# Phase 3-2: データマイグレーション実行スクリプト
# 実行前に必ずバックアップを取得し、テスト環境で検証してください

set -e  # エラーが発生したら即座に停止

# 設定
DB_HOST="localhost"
DB_PORT="15432"
DB_NAME="dojin_management"
DB_USER="dojin_user"
export PGPASSWORD="dojin_password"

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_before_phase3_migration_${TIMESTAMP}.sql"

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Phase 3-2: データマイグレーション実行${NC}"
echo -e "${YELLOW}========================================${NC}"

# 1. バックアップディレクトリの作成
echo -e "\n${GREEN}1. バックアップディレクトリの作成...${NC}"
mkdir -p ${BACKUP_DIR}

# 2. データベースのバックアップ
echo -e "\n${GREEN}2. データベースのバックアップ...${NC}"
pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} > ${BACKUP_FILE}
echo -e "バックアップファイル: ${BACKUP_FILE}"

# 3. バックアップサイズの確認
BACKUP_SIZE=$(ls -lh ${BACKUP_FILE} | awk '{print $5}')
echo -e "バックアップサイズ: ${BACKUP_SIZE}"

# 4. 確認プロンプト
echo -e "\n${YELLOW}マイグレーションを実行しますか？ (y/N)${NC}"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo -e "${RED}マイグレーションをキャンセルしました。${NC}"
    exit 1
fi

# 5. 初版Editionレコードの生成
echo -e "\n${GREEN}5. 初版Editionレコードの生成...${NC}"
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ./01_create_initial_editions.sql

# 6. ExhibitBookの版対応
echo -e "\n${GREEN}6. ExhibitBookの版対応...${NC}"
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ./02_migrate_exhibit_books.sql

# 7. データ整合性の確認
echo -e "\n${GREEN}7. データ整合性の確認...${NC}"
psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f ./03_verify_data_integrity.sql

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}マイグレーションが完了しました！${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}次のステップ:${NC}"
echo -e "1. アプリケーションの動作確認を行ってください"
echo -e "2. 問題が発生した場合は以下のコマンドでロールバック可能です:"
echo -e "   psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} < ${BACKUP_FILE}"