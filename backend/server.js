const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  'https://kqrwvlsxysvmfpwnowap.supabase.co',
  'sb_publishable_P7Snv-eAQ-9Q5RrMp-CKaQ_mu9pKOcZ'
);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Backend Banco Seguro funcionando ✅' });
});

// Verificar identidad
app.post('/verificar', async (req, res) => {
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ autorizado: false, mensaje: 'Falta el nombre' });
  }

  // Buscar usuario en Supabase
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .ilike('nombre', `%${nombre}%`)
    .limit(1);

  if (error || !data || data.length === 0) {
    return res.json({
      autorizado: false,
      confianza: 0,
      mensaje: 'Usuario no encontrado',
    });
  }

  const usuario = data[0];

  return res.json({
    autorizado: usuario.autorizado,
    confianza: 97.4,
    nombre: usuario.nombre,
    dni: usuario.dni,
    mensaje: usuario.autorizado ? 'Acceso autorizado' : 'Acceso denegado',
  });
});

// Listar usuarios
app.get('/usuarios', async (req, res) => {
  const { data, error } = await supabase.from('usuarios').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});