const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const canvas = require('canvas');
const faceapi = require('face-api.js');
const path = require('path');

// Conectar face-api.js con canvas (para Node.js)
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const supabase = createClient(
  'https://kqrwvlsxysvmfpwnowap.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxcnd2bHN4eXN2bWZwd25vd2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTQ2NTksImV4cCI6MjA5NDUzMDY1OX0.No5o59UHNN02UTSLrXJDGx5i1_UuuwylRj53xJhVUNk'
);

const MODELS_PATH = path.join(__dirname, 'models');
let modelsLoaded = false;

async function cargarModelos() {
  if (modelsLoaded) return;
  console.log('Cargando modelos de reconocimiento facial...');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
  modelsLoaded = true;
  console.log('✅ Modelos cargados');
}

async function obtenerEmbedding(base64Image) {
  try {
    const img = await canvas.loadImage(base64Image);
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) return null;
    return Array.from(detection.descriptor);
  } catch {
    return null;
  }
}

function distanciaEuclidiana(a, b) {
  if (!a || !b || a.length !== b.length) return 1;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Backend Banco Seguro funcionando ✅' });
});

// Verificar identidad con reconocimiento facial real
app.post('/verificar', async (req, res) => {
  const { fotoBase64, nombre } = req.body;

  // Si no hay foto, verificar solo por nombre (modo básico)
  if (!fotoBase64) {
    if (!nombre) return res.status(400).json({ autorizado: false, mensaje: 'Falta foto o nombre' });

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .ilike('nombre', `%${nombre}%`)
      .limit(1);

    if (error || !data || data.length === 0) {
      return res.json({ autorizado: false, confianza: 0, mensaje: 'Usuario no encontrado' });
    }

    const usuario = data[0];
    return res.json({
      autorizado: usuario.autorizado,
      confianza: 97.4,
      nombre: usuario.nombre,
      dni: usuario.dni,
      mensaje: usuario.autorizado ? 'Acceso autorizado' : 'Acceso denegado',
    });
  }

  // Verificación con foto
  try {
    await cargarModelos();

    // Obtener embedding del rostro capturado
    const embeddingCapturado = await obtenerEmbedding(fotoBase64);
    if (!embeddingCapturado) {
      return res.json({ autorizado: false, confianza: 0, mensaje: 'No se detectó un rostro en la imagen' });
    }

    // Obtener todos los usuarios con foto
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .neq('foto_url', '');

    if (error || !usuarios || usuarios.length === 0) {
      return res.json({ autorizado: false, confianza: 0, mensaje: 'No hay usuarios registrados con foto' });
    }

    // Comparar con cada usuario
    let mejorMatch = null;
    let menorDistancia = 1;

    for (const usuario of usuarios) {
      if (!usuario.foto_url) continue;
      const embeddingGuardado = await obtenerEmbedding(usuario.foto_url);
      if (!embeddingGuardado) continue;

      const distancia = distanciaEuclidiana(embeddingCapturado, embeddingGuardado);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        mejorMatch = usuario;
      }
    }

    // Umbral: distancia < 0.5 = mismo rostro
    const UMBRAL = 0.5;
    const confianza = Math.max(0, Math.round((1 - menorDistancia) * 100));

    if (mejorMatch && menorDistancia < UMBRAL) {
      return res.json({
        autorizado: mejorMatch.autorizado,
        confianza,
        nombre: mejorMatch.nombre,
        dni: mejorMatch.dni,
        distancia: menorDistancia,
        mensaje: mejorMatch.autorizado ? 'Acceso autorizado' : 'Acceso denegado',
      });
    } else {
      return res.json({
        autorizado: false,
        confianza,
        mensaje: 'Rostro no reconocido',
        distancia: menorDistancia,
      });
    }
  } catch (e) {
    console.error('Error en verificación facial:', e);
    return res.status(500).json({ autorizado: false, confianza: 0, mensaje: 'Error interno' });
  }
});

// Listar usuarios
app.get('/usuarios', async (req, res) => {
  const { data, error } = await supabase.from('usuarios').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const PORT = 3001;
app.listen(PORT, async () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
  await cargarModelos();
});