const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const FormData = require('form-data');

const supabase = createClient(
  'https://kqrwvlsxysvmfpwnowap.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxcnd2bHN4eXN2bWZwd25vd2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTQ2NTksImV4cCI6MjA5NDUzMDY1OX0.No5o59UHNN02UTSLrXJDGx5i1_UuuwylRj53xJhVUNk'
);

const FACEPP_API_KEY = 'y38ey6GSji_ZygZZ7CgDTsYkcB9mjXEG';
const FACEPP_API_SECRET = '0FvNd8BwEnA3FkKG7TLEhidXYVA8tjTw';

async function obtenerFaceToken(sourceImage) {
  try {
    const form = new FormData();
    form.append('api_key', FACEPP_API_KEY);
    form.append('api_secret', FACEPP_API_SECRET);

    // Si empieza con "data:image" o es un Base64 puro, se manda como archivo
    if (sourceImage.startsWith('data:image') || !sourceImage.startsWith('http')) {
      const imageData = sourceImage.replace(/^data:image\/\w+;base64,/, '');
      form.append('image_base64', imageData);
    } else {
      // Si es una URL tradicional de Supabase/Internet
      form.append('image_url', sourceImage);
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
    console.error(`❌ Error en Face++:`, e?.response?.data ?? e.message);
    return null;
  }
}

async function inicializarTokens() {
  console.log('🚀 Iniciando migración y mapeo de tokens biométricos (Soporte Base64)...');
  
  const { data: usuarios, error } = await supabase
    .from('usuarios')
    .select('*')
    .neq('foto_url', '');

  if (error) {
    console.error('❌ Error consultando Supabase:', error.message);
    return;
  }

  console.log(`📋 Se encontraron ${usuarios.length} usuarios para procesar.`);

  for (const usuario of usuarios) {
    if (usuario.face_token) {
      console.log(`⏩ ${usuario.nombre} ya tiene un token asignado. Saltando...`);
      continue;
    }

    console.log(`📸 Procesando rostro de: ${usuario.nombre}...`);
    const token = await obtenerFaceToken(usuario.foto_url);

    if (token) {
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ face_token: token })
        .eq('id', usuario.id);

      if (updateError) {
        console.error(`❌ Error al guardar token de ${usuario.nombre}:`, updateError.message);
      } else {
        console.log(`✅ Token biométrico asignado con éxito a ${usuario.nombre} (${token})`);
      }
    } else {
      console.log(`⚠️ No se pudo extraer huella facial para ${usuario.nombre}.`);
    }
  }
  console.log('🏁 Proceso de inicialización terminado.');
}

inicializarTokens();
