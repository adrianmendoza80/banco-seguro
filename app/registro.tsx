import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RegistroScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<'form' | 'lista'>('form');
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraActiva, setCameraActiva] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const streamRef = useRef<any>(null);

  useEffect(() => {
    if (vista === 'form') {
      if (Platform.OS === 'web') {
        startWebCamera();
      } else {
        if (permission?.granted) {
          setCameraReady(true);
        } else {
          requestPermission();
        }
      }
    }
    return () => stopCamera();
  }, [vista, permission]);

  useEffect(() => {
    if (busqueda.trim() === '') {
      setUsuariosFiltrados(usuarios);
    } else {
      setUsuariosFiltrados(
        usuarios.filter(u =>
          u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          u.dni.includes(busqueda)
        )
      );
    }
  }, [busqueda, usuarios]);

  const startWebCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 200, height: 200 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      setCameraReady(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t: any) => t.stop());
    }
  };

  const capturarFotoWeb = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -200, 0, 200, 200);
    ctx.restore();
    setFotoCapturada(canvas.toDataURL('image/jpeg', 0.8));
  };

  const capturarFotoNativa = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Cámara no lista, esperá un momento');
      return;
    }
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      if (photo?.base64) {
        setFotoCapturada(`data:image/jpeg;base64,${photo.base64}`);
      } else if (photo?.uri) {
        setFotoCapturada(photo.uri);
      } else {
        Alert.alert('Error', 'No se pudo obtener la imagen');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Error al capturar');
    }
  };

  const registrar = async () => {
    if (!nombre || !dni) {
      Alert.alert('Error', 'Completá nombre y DNI');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('usuarios').insert({
      nombre, dni, autorizado: true, foto_url: fotoCapturada ?? '',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('✅ Listo', `${nombre} registrado correctamente`);
      setNombre(''); setDni(''); setFotoCapturada(null);
      cargarUsuarios();
    }
  };

  const cargarUsuarios = async () => {
    stopCamera();
    const { data, error } = await supabase.from('usuarios').select('*').order('id', { ascending: false });
    if (error) {
      Alert.alert('Error al cargar', error.message);
    }
    if (data) setUsuarios(data);
    setVista('lista');
  };

  const eliminarUsuario = (id: number, nombre: string) => {
    Alert.alert(
      '🗑️ Eliminar usuario',
      `¿Estás seguro que querés eliminar a ${nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('usuarios').delete().eq('id', id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              setUsuarios(prev => prev.filter(u => u.id !== id));
            }
          }
        }
      ]
    );
  };

  const toggleAutorizado = async (id: number, autorizado: boolean) => {
    const { error } = await supabase
      .from('usuarios')
      .update({ autorizado: !autorizado })
      .eq('id', id);
    if (!error) {
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, autorizado: !autorizado } : u));
    }
  };

  return (
    <ScrollView style={styles.scroll}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.back} onPress={() => { stopCamera(); router.back(); }}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Registro de usuarios</Text>
        <Text style={styles.subtitle}>Agregá personas autorizadas a ingresar</Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, vista === 'form' && styles.tabActive]}
            onPress={() => setVista('form')}
          >
            <Text style={[styles.tabText, vista === 'form' && styles.tabTextActive]}>Registrar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, vista === 'lista' && styles.tabActive]}
            onPress={cargarUsuarios}
          >
            <Text style={[styles.tabText, vista === 'lista' && styles.tabTextActive]}>Ver usuarios</Text>
          </TouchableOpacity>
        </View>

        {vista === 'form' && (
          <View style={styles.form}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Juan García"
              placeholderTextColor="#555577"
              value={nombre}
              onChangeText={setNombre}
            />

            <Text style={styles.label}>DNI</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 28456789"
              placeholderTextColor="#555577"
              value={dni}
              onChangeText={setDni}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Foto facial</Text>
            <View style={styles.cameraWrap}>
              {!fotoCapturada ? (
                <>
                  {Platform.OS === 'web' ? (
                    <>
                      {/* @ts-ignore */}
                      <video ref={videoRef} style={{ width: 200, height: 200, borderRadius: 100, objectFit: 'cover', transform: 'scaleX(-1)' }} autoPlay muted playsInline />
                      {/* @ts-ignore */}
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </>
                  ) : permission?.granted ? (
                    <CameraView ref={cameraRef} style={styles.nativeCamera} facing="front" onCameraReady={() => setCameraActiva(true)} />
                  ) : (
                    <TouchableOpacity style={styles.btnCapturar} onPress={requestPermission}>
                      <Text style={styles.btnCapturarText}>📷 Dar permiso de cámara</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.btnCapturar, (!cameraReady && !cameraActiva) && { opacity: 0.5 }]}
                    onPress={Platform.OS === 'web' ? capturarFotoWeb : capturarFotoNativa}
                    disabled={Platform.OS === 'web' ? !cameraReady : !cameraActiva}
                  >
                    <Text style={styles.btnCapturarText}>📷 Capturar foto</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Image source={{ uri: fotoCapturada }} style={styles.fotoPreview} />
                  <TouchableOpacity style={styles.btnRetomar} onPress={() => { setFotoCapturada(null); setCameraActiva(false); }}>
                    <Text style={styles.btnRetomarText}>🔄 Retomar foto</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, loading && { opacity: 0.6 }]}
              onPress={registrar}
              disabled={loading}
            >
              <Text style={styles.btnPrimaryText}>{loading ? 'Registrando...' : 'Registrar usuario →'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {vista === 'lista' && (
          <View style={styles.lista}>
            <TextInput
              style={styles.input}
              placeholder="🔍 Buscar por nombre o DNI..."
              placeholderTextColor="#555577"
              value={busqueda}
              onChangeText={setBusqueda}
            />

            <Text style={styles.countText}>{usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? 's' : ''}</Text>

            {usuariosFiltrados.length === 0 ? (
              <Text style={styles.emptyText}>No se encontraron usuarios.</Text>
            ) : (
              usuariosFiltrados.map((u) => (
                <View key={u.id} style={styles.usuarioCard}>
                  {u.foto_url ? (
                    <Image source={{ uri: u.foto_url }} style={styles.usuarioFoto} />
                  ) : (
                    <View style={styles.usuarioAvatar}>
                      <Text style={styles.usuarioAvatarText}>{u.nombre.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.usuarioInfo}>
                    <Text style={styles.usuarioNombre}>{u.nombre}</Text>
                    <Text style={styles.usuarioDni}>DNI: {u.dni}</Text>
                  </View>
                  <View style={styles.acciones}>
                    <TouchableOpacity
                      style={[styles.btnAccion, u.autorizado ? styles.btnDesactivar : styles.btnActivar]}
                      onPress={() => toggleAutorizado(u.id, u.autorizado)}
                    >
                      <Text style={styles.btnAccionText}>{u.autorizado ? '🔒' : '🔓'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnAccion, styles.btnEliminar]}
                      onPress={() => eliminarUsuario(u.id, u.nombre)}
                    >
                      <Text style={styles.btnAccionText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0f0f1a' },
  container: { padding: 24, gap: 16 },
  back: { marginTop: 40 },
  backText: { color: '#5577ff', fontSize: 14 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 13, color: '#8888aa' },
  tabs: { flexDirection: 'row', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#3355ff' },
  tabText: { fontSize: 14, color: '#8888aa' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  form: { gap: 12 },
  label: { fontSize: 13, color: '#8888aa' },
  input: {
    backgroundColor: '#1a1a2e', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    color: '#fff', fontSize: 15,
    borderWidth: 0.5, borderColor: '#2a2a4a',
  },
  cameraWrap: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  nativeCamera: { width: 200, height: 200, borderRadius: 100, overflow: 'hidden' },
  fotoPreview: { width: 200, height: 200, borderRadius: 100 },
  btnCapturar: {
    backgroundColor: '#1a1a2e', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 24,
    borderWidth: 0.5, borderColor: '#3355ff',
  },
  btnCapturarText: { color: '#3355ff', fontSize: 14, fontWeight: '600' },
  btnRetomar: {
    backgroundColor: '#1a1a2e', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 24,
    borderWidth: 0.5, borderColor: '#8888aa',
  },
  btnRetomarText: { color: '#8888aa', fontSize: 14 },
  btnPrimary: {
    backgroundColor: '#3355ff', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  lista: { gap: 10 },
  countText: { fontSize: 12, color: '#555577', textAlign: 'right' },
  emptyText: { color: '#8888aa', textAlign: 'center', marginTop: 20 },
  usuarioCard: {
    backgroundColor: '#1a1a2e', borderRadius: 14,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 0.5, borderColor: '#2a2a4a',
  },
  usuarioFoto: { width: 44, height: 44, borderRadius: 22 },
  usuarioAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#3355ff', alignItems: 'center', justifyContent: 'center',
  },
  usuarioAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  usuarioInfo: { flex: 1 },
  usuarioNombre: { fontSize: 15, fontWeight: '600', color: '#fff' },
  usuarioDni: { fontSize: 12, color: '#8888aa', marginTop: 2 },
  acciones: { flexDirection: 'row', gap: 8 },
  btnAccion: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnActivar: { backgroundColor: '#0a2a1a' },
  btnDesactivar: { backgroundColor: '#2a1a0a' },
  btnEliminar: { backgroundColor: '#2a0a0a' },
  btnAccionText: { fontSize: 16 },
});