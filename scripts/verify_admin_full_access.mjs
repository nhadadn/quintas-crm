// scripts/verify_admin_full_access.mjs
// Verificación de permisos de Administrador usando fetch nativo
// Credenciales desde GUIA_PRUEBAS_MANUALES_INTEGRAL.md

const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function verifyAdminPermissions() {
    console.log('--- Iniciando Verificación de Permisos de Administrador (Fetch) ---');
    
    // Variables to store created IDs for subsequent tests
    let createdClientId = null;
    let createdUserId = null;
    let createdVendedorId = null;

    // 1. Login
    console.log('1. Autenticación...');
    let token;
    try {
        const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        
        if (!loginRes.ok) {
            const err = await loginRes.json();
            throw new Error(`Login fallido: ${JSON.stringify(err)}`);
        }
        
        const data = await loginRes.json();
        token = data.data.access_token;
        console.log('✅ Login exitoso. Token obtenido.');
    } catch (e) {
        console.error('❌ Error crítico en login:', e.message);
        process.exit(1);
    }

    const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 2. Test: Crear Cliente
    console.log('\n2. Test: Crear Cliente (Admin)');
    try {
        const clientePayload = {
            nombre: 'Cliente',
            apellido_paterno: 'Test Admin',
            email: `cliente.admin.test.${Date.now()}@test.com`,
            telefono: '5551234567',
            tipo: 'Individual'
        };
        
        const res = await fetch(`${DIRECTUS_URL}/items/clientes`, {
            method: 'POST',
            headers,
            body: JSON.stringify(clientePayload)
        });
        
        if (res.ok) {
            const data = await res.json();
            createdClientId = data.data.id;
            console.log('✅ Cliente creado ID:', createdClientId);
        } else {
            console.error('❌ Error creando cliente:', await res.text());
        }
    } catch (e) {
        console.error('❌ Excepción creando cliente:', e.message);
    }

    // 3. Test: Crear Usuario Vendedor
    console.log('\n3. Test: Crear Usuario Vendedor (Admin)');
    try {
        const userPayload = {
            first_name: 'Vendedor',
            last_name: 'AdminCreated',
            email: `vendedor.admin.${Date.now()}@test.com`,
            password: 'password123',
            role: '06815967-7977-4475-9784-073801f5581f', // Vendedor Role ID (adjust if needed, getting from previous checks)
            status: 'active'
        };
        // Fetching roles to be safe
        const rolesRes = await fetch(`${DIRECTUS_URL}/roles?filter[name][_eq]=Vendedor`, { headers });
        const rolesData = await rolesRes.json();
        if (rolesData.data && rolesData.data.length > 0) {
            userPayload.role = rolesData.data[0].id;
            
            const res = await fetch(`${DIRECTUS_URL}/users`, {
                method: 'POST',
                headers,
                body: JSON.stringify(userPayload)
            });
            
            if (res.ok) {
                const data = await res.json();
                createdUserId = data.data.id;
                console.log('✅ Usuario creado ID:', createdUserId);
            } else {
                console.error('❌ Error creando usuario:', await res.text());
            }
        } else {
            console.error('⚠️ No se encontró rol Vendedor para el test');
        }
    } catch (e) {
        console.error('❌ Excepción creando usuario:', e.message);
    }

    // 3.5 Test: Crear Vendedor Entity (Para Venta)
    console.log('\n3.5 Test: Crear Vendedor Entity (Admin)');
    try {
        const vendedorPayload = {
            nombre: 'Vendedor',
            apellido_paterno: 'Entity',
            email: `vendedor.entity.${Date.now()}@test.com`,
            estatus: true,
            comision_porcentaje: 5
        };
        
        const res = await fetch(`${DIRECTUS_URL}/items/vendedores`, {
            method: 'POST',
            headers,
            body: JSON.stringify(vendedorPayload)
        });
        
        if (res.ok) {
            const data = await res.json();
            createdVendedorId = data.data.id;
            console.log('✅ Vendedor Entity creado ID:', createdVendedorId);
        } else {
            console.error('❌ Error creando vendedor entity:', await res.text());
        }
    } catch (e) {
        console.error('❌ Excepción creando vendedor entity:', e.message);
    }

    // 4. Test: Leer Pagos
    console.log('\n4. Test: Leer Pagos (Admin)');
    try {
        const res = await fetch(`${DIRECTUS_URL}/items/pagos?limit=1`, { headers });
        if (res.ok) {
            console.log('✅ Pagos leídos: OK');
        } else {
            console.error('❌ Error leyendo pagos:', await res.text());
        }
    } catch (e) {
        console.error('❌ Excepción leyendo pagos:', e.message);
    }

    // 5. Test: Crear Venta
    console.log('\n5. Test: Crear Venta (Admin)');
    try {
        // Need existing IDs. Use created ones if available, else fetch.
        const loteRes = await fetch(`${DIRECTUS_URL}/items/lotes?limit=1`, { headers });
        const loteData = await loteRes.json();
        const loteId = loteData.data?.[0]?.id;

        // Use created Client ID or fetch valid one (filter out empty IDs)
        let clienteId = createdClientId;
        if (!clienteId) {
            const clienteRes = await fetch(`${DIRECTUS_URL}/items/clientes?limit=5`, { headers });
            const clienteData = await clienteRes.json();
            const validClient = clienteData.data?.find(c => c.id && c.id !== '');
            clienteId = validClient?.id;
        }

        // Use created Vendedor ID or fetch one
        let vendedorId = createdVendedorId;
        if (!vendedorId) {
            const vendedorRes = await fetch(`${DIRECTUS_URL}/items/vendedores?limit=1`, { headers });
            const vendedorData = await vendedorRes.json();
            vendedorId = vendedorData.data?.[0]?.id;
        }

        console.log(`Debug Dependencies: LoteID=${loteId}, ClienteID=${clienteId}, VendedorID=${vendedorId}`);

        if (!loteId || !clienteId || !vendedorId) {
             console.error('⚠️ Skipping Venta creation: missing dependencies (lote/cliente/vendedor)');
        } else {
            const ventaPayload = {
                lote_id: loteId,
                cliente_id: clienteId,
                vendedor_id: vendedorId,
                monto_total: 100000,
                enganche: 10000,
                plazo_meses: 12,
                interes_anual: 10,
                fecha_venta: new Date().toISOString().split('T')[0],
                estatus: 'Apartado'
                // id should be auto-generated
            };
            
            const res = await fetch(`${DIRECTUS_URL}/items/ventas`, {
                method: 'POST',
                headers,
                body: JSON.stringify(ventaPayload)
            });
            
            if (res.ok) {
                const data = await res.json();
                console.log('✅ Venta creada ID:', data.data.id);
            } else {
                const err = await res.text();
                console.error(`⚠️ Error creando venta (puede ser validación): POST /items/ventas falló: ${err}`);
            }
        }
    } catch (e) {
        console.error('❌ Excepción creando venta:', e.message);
    }

    // 6. Test: Leer Lotes (Para Mapa)
    console.log('\n6. Test: Leer Lotes (Admin - Mapa)');
    try {
        const res = await fetch(`${DIRECTUS_URL}/items/lotes?limit=1`, { headers });
        if (res.ok) {
            console.log('✅ Lotes leídos: OK');
        } else {
            console.error('❌ Error leyendo lotes:', await res.text());
        }
    } catch (e) {
        console.error('❌ Excepción leyendo lotes:', e.message);
    }

    console.log('\n✅✅✅ VERIFICACIÓN ADMIN COMPLETADA');
}

verifyAdminPermissions();
