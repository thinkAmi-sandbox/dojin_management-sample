import 'reflect-metadata'
import dotenv from 'dotenv'

// テスト環境の設定
process.env.NODE_ENV = 'test'

// テスト実行時に.envファイルを読み込み
dotenv.config()
