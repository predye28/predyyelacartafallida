// netlify/functions/notes.js
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
    const method = event.httpMethod;

    // ─── GET: Obtener todas las notas públicas ─────────────────────────────────
    if (method === 'GET') {
        if (!supabaseUrl || !supabaseKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ ok: false, error: 'Supabase no configurado' }),
            };
        }

        try {
            const { data, error } = await supabase
                .from('notes')
                .select('id, content, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ok: true, notes: data }),
            };
        } catch (err) {
            console.error('Error al obtener notas:', err);
            return {
                statusCode: 500,
                body: JSON.stringify({ ok: false, error: 'Error interno del servidor' }),
            };
        }
    }

    // ─── POST: Crear una nueva nota y validar (protegido por contraseña) ───────
    if (method === 'POST') {
        try {
            const body = JSON.parse(event.body || '{}');
            const { password, content, action } = body;

            // 1. Validar la contraseña primero
            if (!password) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ ok: false, error: 'Falta la contraseña' }),
                };
            }

            if (password !== process.env.PUBLISH_PASSWORD) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ ok: false, error: 'Contraseña incorrecta' }),
                };
            }

            // 2. Si es solo para verificar contraseña, retorna éxito temprano
            if (action === 'verify') {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ ok: true }),
                };
            }

            // 3. Ya estamos autorizados, verificamos el contenido de la nota
            if (!content) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ ok: false, error: 'Falta el contenido de la nota' }),
                };
            }

            const trimmed = content.trim();
            if (!trimmed) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ ok: false, error: 'La nota no puede estar vacía' }),
                };
            }

            // Insertar en Supabase
            const { data, error } = await supabase
                .from('notes')
                .insert([{ content: trimmed }])
                .select('id, content, created_at')
                .single();

            if (error) throw error;

            return {
                statusCode: 201,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ok: true, note: data }),
            };
        } catch (err) {
            console.error('Error al guardar nota:', err);
            return {
                statusCode: 500,
                body: JSON.stringify({ ok: false, error: 'Error interno del servidor' }),
            };
        }
    }

    // Si no es GET ni POST
    return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, error: 'Método no permitido' }),
    };
};
