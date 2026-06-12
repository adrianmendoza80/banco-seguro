// VERSION FACE++ v2
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const supabase = createClient(
  'https://kqrwvlsxysvmfpwnowap.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxcnd2bHN4eXN2bWZwd25vd2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTQ2NTksImV4cCI6MjA5NDUzMDY1OX0.No5o59UHNN02UTSLrXJDGx5i1_UuuwylRj53xJhVUNk'
);

const FACEPP_API_KEY = 'y38ey6GSji_ZygZZ7CgDTsYkcB9mjXEG';
const FACEPP_API_SECRET = '0FvNd8BwEnA3FkKG7TLEhidXYVA8tjTw';

// Detectar rostro (Soporta Base64 o URL de internet)
async function detectarRostro(sourceImage, isUrl = false) {
  try {
    const form = new FormData();
    form.append('api_key', FACEPP_API_KEY);
    form.append('api_secret', FACEPP_API_SECRET);

    if (isUrl) {
      form.append('image_url', sourceImage);
    } else {
      const imageData = sourceImage.replace(/^data:image\/\w+;base64,/, '');
      form.append('image_base64', imageData);
    }

    const response = await axios.post(
      'https://api-us.faceplusplus.com/facepp/v3/detect',
      form,
      { headers: form.getHeaders() }
    );

    if (response.data.faces && response.data.faces.length > 0) {
      return response.data.faces[0].face_token;
    }
    return null;
  } catch (e) {
    console.error('Error detectando rostro:', e?.response?.data ?? e.message);
    return null;
  }
}

// Comparar dos face_tokens
async function compararRostros(token1, token2) {
  try {
    const form = new FormData();
    form.append('api_key', FACEPP_API_KEY);
    form.append('api_secret', FACEPP_API_SECRET);
    form.append('face_token1', token1);
    form.append('face_token2', token2);

    const response = await axios.post(
      'https://api-us.faceplusplus.com/facepp/v3/compare',
      form,
      { headers: form.getHeaders() }
    );

    return response.data.confidence ?? 0;
  } catch (e) {
    console.error('Error comparando rostros:', e?.response?.data ?? e.message);
    return 0;
  }
}

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Backend Banco Seguro con Face++ ✅' });
});

// Verificar identidad con Face++
app.post('/verificar', async (req, res) => {
  const { fotoBase64 } = req.body;

  if (!fotoBase64) {
    return res.status(400).json({ autorizado: false, mensaje: 'Falta la foto' });
  }

  try {
    // Detectar rostro en la foto capturada (viene en base64)
    const tokenCapturado = await detectarRostro(fotoBase64, false);
    if (!tokenCapturado) {
      return res.json({
        autorizado: false,
        confianza: 0,
        mensaje: 'No se detectó un rostro. Mirá directo a la cámara.',
      });
    }

    // Obtener usuarios con foto de Supabase
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .neq('foto_url', '');

    if (error || !usuarios || usuarios.length === 0) {
      return res.json({ autorizado: false, confianza: 0, mensaje: 'No hay usuarios registrados con foto' });
    }

    let mejorMatch = null;
    let mayorConfianza = 0;

    // Comparar con cada usuario
    for (const usuario of usuarios) {
      if (!usuario.foto_url) continue;
      
      // Enviamos la URL especificando true
      const tokenGuardado = await detectarRostro(usuario.foto_url, true);
      if (!tokenGuardado) continue;

      const confianza = await compararRostros(tokenCapturado, tokenGuardado);
      console.log(`Comparando con ${usuario.nombre}: ${confianza}%`);

      if (confianza > mayorConfianza) {
        mayorConfianza = confianza;
        mejorMatch = usuario;
      }
    }

    // Umbral: confianza > 75% = mismo rostro
    const UMBRAL = 75;

    if (mejorMatch && mayorConfianza >= UMBRAL) {
      return res.json({
        autorizado: mejorMatch.autorizado,
        confianza: Math.round(mayorConfianza),
        nombre: mejorMatch.nombre,
        dni: mejorMatch.dni,
        mensaje: mejorMatch.autorizado ? 'Acceso autorizado' : 'Acceso denegado',
      });
    } else {
      return res.json({
        autorizado: false,
        confianza: Math.round(mayorConfianza),
        mensaje: 'Rostro no reconocido',
      });
    }
  } catch (e) {
    console.error('Error en verificación:', e);
    return res.status(500).json({ autorizado: false, confianza: 0, mensaje: 'Error interno' });
  }
});

// Listar usuarios
app.get('/usuarios', async (req, res) => {
  const { data, error } = await supabase.from('usuarios').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Exportación para Vercel serverless y fallback de puerto local
const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Backend corriendo localmente en http://localhost:${PORT}`);
  });
}

module.exports = app;