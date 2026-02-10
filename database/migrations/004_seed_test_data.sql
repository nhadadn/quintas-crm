
-- Migration: 004_seed_test_data.sql
-- Description: Datos de prueba: Usuario Cliente y Perfil asociado (T5.2.8)
-- Updated for Directus 10.10+ Schema (Role ID changed)
-- Author: Backend Agent
-- Date: 2026-01-31

SET NAMES utf8mb4;

-- 2. Insertar Usuario Directus
-- user_uuid: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
-- role_id: 958022d8-5421-4202-8610-85af40751339
-- email: cliente.prueba@quintas.com
INSERT INTO `directus_users` (`id`, `first_name`, `last_name`, `email`, `password`, `role`, `status`, `provider`, `token`)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Cliente', 'Prueba', 'cliente.prueba@quintas.com', '$argon2id$v=19$m=65536,t=3,p=4$1PI5QjqKEiDj8jTPHoJNRg$1bTgH8UYNDlfahoRvgrnTamtPtSlLKBqzUFpouTXcuU', '958022d8-5421-4202-8610-85af40751339', 'active', 'default', NULL
WHERE NOT EXISTS (SELECT 1 FROM `directus_users` WHERE `email` = 'cliente.prueba@quintas.com');

-- 3. Insertar Perfil de Cliente
-- client_uuid: b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22
-- RFC changed to XAXX010101999 to avoid conflict with existing test data
INSERT INTO `clientes` (`id`, `nombre`, `apellido_paterno`, `email`, `estatus`, `user_id`, `telefono`, `rfc`, `direccion`, `ciudad`)
SELECT 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Cliente', 'Prueba', 'cliente.prueba@quintas.com', 'activo', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '555-000-0000', 'XAXX010101999', 'Calle Prueba 123', 'Durango'
WHERE NOT EXISTS (SELECT 1 FROM `clientes` WHERE `email` = 'cliente.prueba@quintas.com');

-- 4. Actualizar relación si ya existía el cliente pero no el user_id (Idempotencia)
UPDATE `clientes` SET `user_id` = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' 
WHERE `email` = 'cliente.prueba@quintas.com' AND `user_id` IS NULL;
