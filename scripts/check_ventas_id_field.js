// scripts/check_ventas_id_field.js
const { createDirectus, staticToken, rest, readItems } = require('@directus/sdk');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración DB (Hardcoded for local env based on previous context)
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'password', // Asumiendo local standard
    database: 'quintas_crm' // Asumiendo nombre DB standard
};

async function checkVentasId() {
    console.log('--- Verificando campo ID en Ventas ---');
    
    // 1. Check Directus Fields
    // Usaremos fetch directo para no depender de mysql si credentials fallan
    const DIRECTUS_URL = 'http://127.0.0.1:8055';
    const ADMIN_TOKEN = 'admin-token'; // O login dinámico

    try {
        // Login admin para consultar fields
        const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@quintas.com', password: 'admin_quintas_2024' })
        });
        const token = (await loginRes.json()).data.access_token;

        const fieldsRes = await fetch(`${DIRECTUS_URL}/fields/ventas/id`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (fieldsRes.ok) {
            const field = (await fieldsRes.json()).data;
            console.log('✅ Campo ID en Directus:', JSON.stringify(field.schema, null, 2));
            console.log('Special:', field.special);
            console.log('Interface:', field.interface);
        } else {
            console.log('❌ Campo ID NO encontrado en Directus Fields (404)');
        }

    } catch (e) {
        console.error('Error checking Directus:', e.message);
    }
}

checkVentasId();
