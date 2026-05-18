import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RegistroScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [vista, setVista] = useState<'form' | 'lista'>('form');
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const streamRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && vista === 'form') {
      startCamera();
    }
    return () => stopCamera();
  }, [vista]);

  const startCamera = async () => {
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

  const capturarFoto = () => {
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setFotoCapturada(dataUrl);
  };

  const registrar = async () => {
    if (!nombre || !dni) {
      Alert.alert('Error', 'Completá nombre y DNI');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('usuarios').insert({
      nombre,
      dni,
      autorizado: true,
      foto_url: fotoCapturada ?? '',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('✅ Listo', `${nombre} registrado correctamente`);
      setNombre('');
      setDni('');
      setFotoCapturada(null);
    }
  };

  const cargarUsuarios = async () => {
    stopCamera();
    const { data } = await supabase.from('usuarios').select('*');
    if (data) setUsuarios(data);
    setVista('lista');
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

            {/* Cámara o foto capturada */}
            <View style={styles.cameraWrap}>
              {!fotoCapturada ? (
                <>
                  {Platform.OS === 'web' && (
                    // @ts-ignore
                    <video
                      ref={videoRef}
                      style={{
                        width: 200, height: 200,
                        borderRadius: 100,
                        objectFit: 'cover',
                        transform: 'scaleX(-1)',
                      }}
                      autoPlay muted playsInline
                    />
                  )}
                  {/* Canvas oculto para captura */}
                  {Platform.OS === 'web' && (
                    // @ts-ignore
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                  )}
                  <TouchableOpacity
                    style={[styles.btnCapturar, !cameraReady && { opacity: 0.5 }]}
                    onPress={capturarFoto}
                    disabled={!cameraReady}
                  >
                    <Text style={styles.btnCapturarText}>📷 Capturar foto</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {Platform.OS === 'web' && (
                    // @ts-ignore
                    <img
                      src={fotoCapturada}
                      style={{ width: 200, height: 200, borderRadius: 100, objectFit: 'cover' }}
                    />
                  )}
                  <TouchableOpacity style={styles.btnRetomar} onPress={() => setFotoCapturada(null)}>
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
              <Text style={styles.btnPrimaryText}>
                {loading ? 'Registrando...' : 'Registrar usuario →'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {vista === 'lista' && (
          <View style={styles.lista}>
            {usuarios.length === 0 ? (
              <Text style={styles.emptyText}>No hay usuarios registrados aún.</Text>
            ) : (
              usuarios.map((u) => (
                <View key={u.id} style={styles.usuarioCard}>
                  {u.foto_url && Platform.OS === 'web' ? (
                    // @ts-ignore
                    <img
                      src={u.foto_url}
                      style={{ width: 44, height: 44, borderRadius: 22, objectFit: 'cover' }}
                    />
                  ) : (
                    <View style={styles.usuarioAvatar}>
                      <Text style={styles.usuarioAvatarText}>{u.nombre.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.usuarioInfo}>
                    <Text style={styles.usuarioNombre}>{u.nombre}</Text>
                    <Text style={styles.usuarioDni}>DNI: {u.dni}</Text>
                  </View>
                  <View style={[styles.badge, u.autorizado ? styles.badgeOn : styles.badgeOff]}>
                    <Text style={styles.badgeText}>{u.autorizado ? '✅' : '🚫'}</Text>
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
  emptyText: { color: '#8888aa', textAlign: 'center', marginTop: 20 },
  usuarioCard: {
    backgroundColor: '#1a1a2e', borderRadius: 14,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 0.5, borderColor: '#2a2a4a',
  },
  usuarioAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#3355ff', alignItems: 'center', justifyContent: 'center',
  },
  usuarioAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  usuarioInfo: { flex: 1 },
  usuarioNombre: { fontSize: 15, fontWeight: '600', color: '#fff' },
  usuarioDni: { fontSize: 12, color: '#8888aa', marginTop: 2 },
  badge: { padding: 6, borderRadius: 8 },
  badgeOn: { backgroundColor: '#0a2a1a' },
  badgeOff: { backgroundColor: '#2a0a0a' },
  badgeText: { fontSize: 16 },
});