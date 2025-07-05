erDiagram
%% 同人誌基本情報
DOUJINSHI ||--o{ EDITION : "has"
DOUJINSHI {
int doujinshi_id PK
string title
string circle_name
datetime created_at
datetime updated_at
}

    %% 版情報
    EDITION ||--o{ PRICE : "has"
    EDITION ||--o{ STOCK : "has"
    EDITION ||--o{ PRINTING : "printed"
    EDITION {
        int edition_id PK
        int doujinshi_id FK
        string edition_name
        string author_name
        string genre
        date publish_date
        int page_count
        string size
        string isbn_jan
        text notes
        datetime created_at
        datetime updated_at
    }
    
    %% 価格管理
    PRICE ||--o{ DISCOUNT : "has"
    PRICE {
        int price_id PK
        int edition_id FK
        decimal base_price
        date effective_from
        date effective_to
        datetime created_at
    }
    
    %% 値引き管理
    DISCOUNT {
        int discount_id PK
        int price_id FK
        string discount_type
        decimal discount_rate
        decimal fixed_price
        date start_date
        date end_date
        int location_id FK
        int event_id FK
        datetime created_at
    }
    
    %% 在庫管理
    STOCK }o--|| STORAGE_LOCATION : "stored_at"
    STOCK {
        int stock_id PK
        int edition_id FK
        int location_id FK
        int quantity
        datetime last_updated
    }
    
    %% 保管場所
    STORAGE_LOCATION ||--o{ STOCK : "contains"
    STORAGE_LOCATION ||--o{ CONSIGNMENT : "is_consignee"
    STORAGE_LOCATION {
        int location_id PK
        string location_type
        string location_name
        string address
        boolean is_consignment
        datetime created_at
    }
    
    %% 在庫移動履歴
    STOCK_MOVEMENT {
        int movement_id PK
        int edition_id FK
        int from_location_id FK
        int to_location_id FK
        int quantity
        string movement_type
        string reason
        datetime movement_date
        int created_by FK
    }
    
    %% 販売イベント
    SALES_EVENT {
        int event_id PK
        string event_name
        string event_type
        date start_date
        date end_date
        int location_id FK
    }
    
    %% 販売取引
    SALES_TRANSACTION ||--o{ SALES_DETAIL : "contains"
    SALES_TRANSACTION ||--o{ PAYMENT : "paid_by"
    SALES_TRANSACTION {
        int transaction_id PK
        string transaction_type
        int event_id FK
        int location_id FK
        int customer_id FK
        decimal total_amount
        datetime transaction_date
        string status
        datetime created_at
    }
    
    %% 販売明細
    SALES_DETAIL }o--|| EDITION : "sold"
    SALES_DETAIL {
        int detail_id PK
        int transaction_id FK
        int edition_id FK
        int quantity
        decimal unit_price
        decimal discount_amount
        decimal subtotal
    }
    
    %% 支払い方法
    PAYMENT {
        int payment_id PK
        int transaction_id FK
        string payment_method
        decimal amount
        datetime payment_date
        string status
    }
    
    %% 顧客情報（任意）
    CUSTOMER ||--o{ SALES_TRANSACTION : "purchases"
    CUSTOMER {
        int customer_id PK
        string customer_name
        string email
        string sns_account
        text notes
        datetime created_at
    }
    
    %% 委託管理
    CONSIGNMENT }o--|| STORAGE_LOCATION : "consigned_to"
    CONSIGNMENT ||--o{ CONSIGNMENT_SALES : "reports"
    CONSIGNMENT {
        int consignment_id PK
        int location_id FK
        decimal commission_rate
        string settlement_cycle
        datetime contract_start
        datetime contract_end
        datetime created_at
    }
    
    %% 委託販売報告
    CONSIGNMENT_SALES ||--o{ CONSIGNMENT_SALES_DETAIL : "contains"
    CONSIGNMENT_SALES ||--o{ CONSIGNMENT_SETTLEMENT : "settled_by"
    CONSIGNMENT_SALES {
        int report_id PK
        int consignment_id FK
        date report_period_start
        date report_period_end
        decimal total_sales
        decimal commission_amount
        datetime reported_date
        string status
    }
    
    %% 委託販売明細
    CONSIGNMENT_SALES_DETAIL }o--|| EDITION : "sold"
    CONSIGNMENT_SALES_DETAIL {
        int detail_id PK
        int report_id FK
        int edition_id FK
        int quantity
        decimal unit_price
        decimal subtotal
    }
    
    %% 委託精算
    CONSIGNMENT_SETTLEMENT {
        int settlement_id PK
        int report_id FK
        decimal settlement_amount
        string payment_method
        datetime payment_date
        string bank_account
        string status
    }
    
    %% 印刷情報
    PRINTING {
        int printing_id PK
        int edition_id FK
        string printer_name
        int print_quantity
        decimal printing_cost
        decimal shipping_cost
        date order_date
        date delivery_date
        datetime created_at
    }
    
    %% 印刷配送先
    PRINTING_DELIVERY {
        int delivery_id PK
        int printing_id FK
        int location_id FK
        int quantity
        date delivery_date
    }
    
    %% 返品・返却
    RETURN_TRANSACTION {
        int return_id PK
        string return_type
        int original_transaction_id FK
        int consignment_id FK
        decimal refund_amount
        string reason
        datetime return_date
        string status
    }
    
    %% 返品明細
    RETURN_DETAIL }o--|| EDITION : "returned"
    RETURN_DETAIL {
        int detail_id PK
        int return_id FK
        int edition_id FK
        int quantity
        decimal unit_price
        decimal refund_subtotal
    }
    
    %% リレーションシップの追加
    EDITION ||--o{ STOCK_MOVEMENT : "moved"
    STORAGE_LOCATION ||--o{ STOCK_MOVEMENT : "from"
    STORAGE_LOCATION ||--o{ STOCK_MOVEMENT : "to"
    SALES_EVENT ||--o{ SALES_TRANSACTION : "occurred_at"
    STORAGE_LOCATION ||--o{ SALES_TRANSACTION : "sold_at"
    SALES_EVENT ||--o{ DISCOUNT : "applied_at"
    STORAGE_LOCATION ||--o{ DISCOUNT : "applied_at"
    PRINTING ||--o{ PRINTING_DELIVERY : "delivered"
    STORAGE_LOCATION ||--o{ PRINTING_DELIVERY : "delivered_to"
    SALES_TRANSACTION ||--o{ RETURN_TRANSACTION : "returned"
    CONSIGNMENT ||--o{ RETURN_TRANSACTION : "returned_from"
    RETURN_TRANSACTION ||--o{ RETURN_DETAIL : "contains"