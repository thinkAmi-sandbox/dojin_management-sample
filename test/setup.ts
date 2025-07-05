import 'reflect-metadata'
import dotenv from 'dotenv'

// テスト環境の設定
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error' // テスト時はエラー以上のログのみ表示

// テスト実行時に.envファイルを読み込み
dotenv.config()
