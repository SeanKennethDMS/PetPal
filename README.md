Database Structure

// 1. Getting all the tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

Result:
user_profiles
walk_in_customers
users_table
appointments
booking_history
pets
notifications
products
services
transactions
transaction_items

// 2. Get columns of a specific table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'your_table_name' AND table_schema = 'public';

Results:
> users_table
id uuid
email text
role text
created_at timestamp without time zone
first_name text
last_name text

>user_profiles
id uuid
user_id uuid
first_name text
last_name text
middle_name text
phone_number text
email text
municipality text
region text
barangay text
created_at timestamp without time zone
birthdate date
province text
last_updated timestampwithout timezone


// 3. Get all table and their columns
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

Results:
[
  {
    "table_name": "appointments",
    "column_name": "appointment_id",
    "data_type": "integer"
  },
  {
    "table_name": "appointments",
    "column_name": "user_id",
    "data_type": "uuid"
  },
  {
    "table_name": "appointments",
    "column_name": "pet_id",
    "data_type": "uuid"
  },
  {
    "table_name": "appointments",
    "column_name": "service_id",
    "data_type": "uuid"
  },
  {
    "table_name": "appointments",
    "column_name": "appointment_date",
    "data_type": "date"
  },
  {
    "table_name": "appointments",
    "column_name": "status",
    "data_type": "character varying"
  },
  {
    "table_name": "appointments",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "appointments",
    "column_name": "completed_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "appointments",
    "column_name": "appointment_time",
    "data_type": "time without time zone"
  },
  {
    "table_name": "appointments",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "booking_history",
    "column_name": "history_id",
    "data_type": "integer"
  },
  {
    "table_name": "booking_history",
    "column_name": "appointment_id",
    "data_type": "integer"
  },
  {
    "table_name": "booking_history",
    "column_name": "user_id",
    "data_type": "uuid"
  },
  {
    "table_name": "booking_history",
    "column_name": "pet_id",
    "data_type": "uuid"
  },
  {
    "table_name": "booking_history",
    "column_name": "service_id",
    "data_type": "uuid"
  },
  {
    "table_name": "booking_history",
    "column_name": "status",
    "data_type": "character varying"
  },
  {
    "table_name": "booking_history",
    "column_name": "completed_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "notifications",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "notifications",
    "column_name": "user_id",
    "data_type": "uuid"
  },
  {
    "table_name": "notifications",
    "column_name": "message",
    "data_type": "text"
  },
  {
    "table_name": "notifications",
    "column_name": "is_read",
    "data_type": "boolean"
  },
  {
    "table_name": "notifications",
    "column_name": "type",
    "data_type": "text"
  },
  {
    "table_name": "notifications",
    "column_name": "data",
    "data_type": "jsonb"
  },
  {
    "table_name": "notifications",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "notifications",
    "column_name": "action_type",
    "data_type": "text"
  },
  {
    "table_name": "notifications",
    "column_name": "appointment_id",
    "data_type": "integer"
  },
  {
    "table_name": "notifications",
    "column_name": "notification_id",
    "data_type": "uuid"
  },
  {
    "table_name": "notifications",
    "column_name": "recipient_id",
    "data_type": "uuid"
  },
  {
    "table_name": "notifications",
    "column_name": "sender_id",
    "data_type": "uuid"
  },
  {
    "table_name": "notifications",
    "column_name": "status",
    "data_type": "text"
  },
  {
    "table_name": "pets",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "pets",
    "column_name": "owner_id",
    "data_type": "uuid"
  },
  {
    "table_name": "pets",
    "column_name": "pet_name",
    "data_type": "text"
  },
  {
    "table_name": "pets",
    "column_name": "species",
    "data_type": "text"
  },
  {
    "table_name": "pets",
    "column_name": "breed",
    "data_type": "text"
  },
  {
    "table_name": "pets",
    "column_name": "weight",
    "data_type": "numeric"
  },
  {
    "table_name": "pets",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "pets",
    "column_name": "pets_birthdate",
    "data_type": "date"
  },
  {
    "table_name": "products",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "products",
    "column_name": "name",
    "data_type": "text"
  },
  {
    "table_name": "products",
    "column_name": "sku",
    "data_type": "text"
  },
  {
    "table_name": "products",
    "column_name": "category",
    "data_type": "text"
  },
  {
    "table_name": "products",
    "column_name": "price",
    "data_type": "numeric"
  },
  {
    "table_name": "products",
    "column_name": "quantity",
    "data_type": "integer"
  },
  {
    "table_name": "products",
    "column_name": "description",
    "data_type": "text"
  },
  {
    "table_name": "products",
    "column_name": "status",
    "data_type": "text"
  },
  {
    "table_name": "products",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "products",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "products",
    "column_name": "pricing_type",
    "data_type": "text"
  },
  {
    "table_name": "services",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "services",
    "column_name": "name",
    "data_type": "text"
  },
  {
    "table_name": "services",
    "column_name": "description",
    "data_type": "text"
  },
  {
    "table_name": "services",
    "column_name": "category",
    "data_type": "text"
  },
  {
    "table_name": "services",
    "column_name": "sub_category",
    "data_type": "text"
  },
  {
    "table_name": "services",
    "column_name": "price",
    "data_type": "jsonb"
  },
  {
    "table_name": "services",
    "column_name": "pricing_type",
    "data_type": "text"
  },
  {
    "table_name": "services",
    "column_name": "color",
    "data_type": "text"
  },
  {
    "table_name": "services",
    "column_name": "duration",
    "data_type": "integer"
  },
  {
    "table_name": "services",
    "column_name": "status",
    "data_type": "text"
  },
  {
    "table_name": "services",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "services",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "transaction_items",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "transaction_items",
    "column_name": "transaction_id",
    "data_type": "uuid"
  },
  {
    "table_name": "transaction_items",
    "column_name": "item_id",
    "data_type": "uuid"
  },
  {
    "table_name": "transaction_items",
    "column_name": "item_type",
    "data_type": "text"
  },
  {
    "table_name": "transaction_items",
    "column_name": "item_name",
    "data_type": "text"
  },
  {
    "table_name": "transaction_items",
    "column_name": "quantity",
    "data_type": "integer"
  },
  {
    "table_name": "transaction_items",
    "column_name": "price",
    "data_type": "numeric"
  },
  {
    "table_name": "transaction_items",
    "column_name": "subtotal",
    "data_type": "numeric"
  },
  {
    "table_name": "transaction_items",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "transactions",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "transactions",
    "column_name": "user_id",
    "data_type": "uuid"
  },
  {
    "table_name": "transactions",
    "column_name": "transaction_code",
    "data_type": "text"
  },
  {
    "table_name": "transactions",
    "column_name": "total_amount",
    "data_type": "numeric"
  },
  {
    "table_name": "transactions",
    "column_name": "payment_method",
    "data_type": "text"
  },
  {
    "table_name": "transactions",
    "column_name": "status",
    "data_type": "text"
  },
  {
    "table_name": "transactions",
    "column_name": "transaction_type",
    "data_type": "text"
  },
  {
    "table_name": "transactions",
    "column_name": "remarks",
    "data_type": "text"
  },
  {
    "table_name": "transactions",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "transactions",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone"
  },
  {
    "table_name": "transactions",
    "column_name": "tax_amount",
    "data_type": "numeric"
  },
  {
    "table_name": "transactions",
    "column_name": "subtotal_amount",
    "data_type": "numeric"
  },
  {
    "table_name": "user_profiles",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "user_profiles",
    "column_name": "user_id",
    "data_type": "uuid"
  },
  {
    "table_name": "user_profiles",
    "column_name": "first_name",
    "data_type": "text"
  },
  {
    "table_name": "user_profiles",
    "column_name": "last_name",
    "data_type": "text"
  },
  {
    "table_name": "user_profiles",
    "column_name": "middle_name",
    "data_type": "text"
  },
  {
    "table_name": "user_profiles",
    "column_name": "phone_number",
    "data_type": "text"
  },
  {
    "table_name": "user_profiles",
    "column_name": "email",
    "data_type": "text"
  },
  {
    "table_name": "user_profiles",
    "column_name": "municipality",
    "data_type": "text"
  },
  {
    "table_name": "user_profiles",
    "column_name": "region",
    "data_type": "text"
  },
  {
    "table_name": "user_profiles",
    "column_name": "barangay",
    "data_type": "text"
  },
  {
    "table_name": "user_profiles",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "user_profiles",
    "column_name": "birthdate",
    "data_type": "date"
  },
  {
    "table_name": "user_profiles",
    "column_name": "province",
    "data_type": "text"
  },
  {
    "table_name": "user_profiles",
    "column_name": "last_updated",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "users_table",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "users_table",
    "column_name": "email",
    "data_type": "text"
  },
  {
    "table_name": "users_table",
    "column_name": "role",
    "data_type": "text"
  },
  {
    "table_name": "users_table",
    "column_name": "created_at",
    "data_type": "timestamp without time zone"
  },
  {
    "table_name": "users_table",
    "column_name": "first_name",
    "data_type": "text"
  },
  {
    "table_name": "users_table",
    "column_name": "last_name",
    "data_type": "text"
  },
  {
    "table_name": "walk_in_customers",
    "column_name": "id",
    "data_type": "uuid"
  },
  {
    "table_name": "walk_in_customers",
    "column_name": "first_name",
    "data_type": "text"
  },
  {
    "table_name": "walk_in_customers",
    "column_name": "last_name",
    "data_type": "text"
  },
  {
    "table_name": "walk_in_customers",
    "column_name": "email",
    "data_type": "text"
  },
  {
    "table_name": "walk_in_customers",
    "column_name": "phone_number",
    "data_type": "text"
  },
  {
    "table_name": "walk_in_customers",
    "column_name": "created_at",
    "data_type": "timestamp with time zone"
  }
]