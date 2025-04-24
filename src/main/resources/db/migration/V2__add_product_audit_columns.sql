ALTER TABLE products
ADD COLUMN created_when TIMESTAMP NULL,
ADD COLUMN updated_when TIMESTAMP NULL,
ADD COLUMN updated_by_id BIGINT NULL,
ADD CONSTRAINT fk_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id); 