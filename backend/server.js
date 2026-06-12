const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Soporte para imágenes Base64 pesadas

// 🌐 Configuración de Supabase
const SUPABASE_URL = 'https://kqrwvlsxysvmfpwnowap.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxcnd2bHN4eXN2bWZwd25vd2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTQ2NTksImV4cCI6MjA5NDUzMDY1OX0.No5o59UHNN02UTSLrXJDGx5i1_UuuwylRj53xJhVUNk';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 📸 Credenciales de Face++
const FACEPP_API_KEY = 'y38ey6GSji_ZygZZ7CgDTsYkcB9mjXEG';
const FACEPP_API_SECRET = '0FvNd8BwEnA3FkKG7TLEhidXYVA8tjTw';

/**
 * 🏠 RUTA RAÍZ (Evita el Error 404 en Vercel)
 * Al entrar directamente a https://banco-seguro-backend.vercel.app verás este mensaje
 */
app.get('/', (req, res) => {
    res.json({
        status: "ok",
        mensaje: "Backend de Banco Seguro Activo y Optimizado ✅",
        version: "2.0.0",
        soporte_biometrico: "Face++ Token Mapping Activo"
    });
});

/**
 * 🔍 RUTA DE VERIFICACIÓN /backend (Opcional por compatibilidad)
 */
app.get('/backend', (req, res) => {
    res.json({ status: "ok", mensaje: "Ruta /backend respondiendo correctamente" });
});

/**
 * 🔐 RUTA DE AUTENTICACIÓN BIOMÉTRICA
 * Compara el rostro enviado por la app con el token guardado en Supabase
 */
app.post('/api/login-biometrico', async (req, res) => {
    try {
        const { id_usuario, foto_base64 } = req.body;

        if (!id_usuario || !foto_base64) {
            return res.status(400).json({ error: 'Faltan parámetros requeridos (id_usuario o foto_base64)' });
        }

        // 1. Buscar el token biométrico del usuario en Supabase
        const { data: usuario, error: dbError } = await supabase
            .from('usuarios')
            .select('face_token, nombre')
            .eq('id', id_usuario)
            .single();

        if (dbError || !usuario || !usuario.face_token) {
            return res.status(404).json({ error: 'Usuario no encontrado o no tiene una huella facial registrada' });
        }

        // 2. Enviar la foto actual en Base64 a Face++ para obtener el token de validación del momento
        const cleanBase64 = foto_base64.replace(/^data:image\/\w+;base64,/, '');
        const formDetect = new FormData();
        formDetect.append('api_key', FACEPP_API_KEY);
        formDetect.append('api_secret', FACEPP_API_SECRET);
        formDetect.append('image_base64', cleanBase64);

        const detectResponse = await axios.post('https://api-us.faceplusplus.com/facepp/v3/detect', formDetect, {
            headers: formDetect.getHeaders()
        });

        if (!detectResponse.data.faces || detectResponse.data.faces.length === 0) {
            return res.status(400).json({ error: 'No se detectó ningún rostro en la captura actual' });
        }

        const faceTokenActual = detectResponse.data.faces[0].face_token;

        // 3. Comparar de manera ultra rápida los dos tokens (el histórico de Supabase vs el actual)
        const formCompare = new FormData();
        formCompare.append('api_key', FACEPP_API_KEY);
        formCompare.append('api_secret', FACEPP_API_SECRET);
        formCompare.append('face_token1', usuario.face_token);
        formCompare.append('face_token2', faceTokenActual);

        const compareResponse = await axios.post('https://api-us.faceplusplus.com/facepp/v3/compare', formCompare, {
            headers: formCompare.getHeaders()
        });

        const confianza = compareResponse.data.confidence;
        const umbralAceptable = 75.0; // Face++ recomienda más de 75 para alta seguridad militar/bancaria

        if (confianza >= umbralAceptable) {
            console.log(`✅ Acceso concedido exitosamente a ${usuario.nombre}. Confianza: ${confianza}%`);
            return res.json({ 
                success: true, 
                message: `Bienvenido/a ${usuario.nombre}`, 
                confidence: confianza 
            });
        } else {
            console.log(`❌ Intento de acceso fallido para ${usuario.nombre}. Confianza insuficiente: ${confianza}%`);
            return res.status(401).json({ 
                success: false, 
                error: 'Acceso denegado: El rostro no coincide con los registros biométricos del banco.' 
            });
        }

    } catch (e) {
        console.error('❌ Error crítico en login biométrico:', e?.response?.data ?? e.message);
        return res.status(500).json({ error: 'Error interno del servidor en procesamiento biométrico' });
    }
});

// Inicialización del servidor local (Vercel maneja esto dinámicamente)
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Express ejecutándose en el puerto ${PORT}`);
});
