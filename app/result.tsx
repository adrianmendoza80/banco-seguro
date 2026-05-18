import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ResultScreen() {
  const router = useRouter();
  const { authorized, confidence, name } = useLocalSearchParams();
  const isAuthorized = authorized === 'true';
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
    const timer = setTimeout(() => router.push('/'), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>

      <Animated.View style={[
        styles.iconWrap,
        { transform: [{ scale: scaleAnim }] },
        isAuthorized ? styles.iconSuccess : styles.iconDanger
      ]}>
        <Text style={styles.iconEmoji}>{isAuthorized ? '✅' : '🚫'}</Text>
      </Animated.View>

      <Text style={styles.title}>
        {isAuthorized ? 'Identidad verificada' : 'Acceso denegado'}
      </Text>
      <Text style={styles.subtitle}>
        {isAuthorized ? 'Podés ingresar a la sucursal' : 'No fue posible verificar tu identidad'}
      </Text>

      <View style={[styles.badge, isAuthorized ? styles.badgeSuccess : styles.badgeDanger]}>
        <Text style={[styles.badgeText, isAuthorized ? styles.badgeTextSuccess : styles.badgeTextDanger]}>
          {isAuthorized ? '🔓 Acceso autorizado' : '🔒 Acceso bloqueado'}
        </Text>
      </View>

      {isAuthorized && (
        <View style={styles.card}>
          <Row label="Usuario" value={String(name ?? 'Juan García')} />
          <Row label="Sucursal" value="Centro — Bs. As." />
          <Row label="Confianza" value={`${confidence ?? '97.4'}%`} valueColor="#22cc66" />
          <Row label="Horario" value={new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} />
        </View>
      )}

      {!isAuthorized && (
        <View style={styles.cardDanger}>
          <Text style={styles.dangerText}>
            Asegurate de tener buena iluminación y mirá directo a la cámara.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.push('/scan')}>
            <Text style={styles.retryText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.btnHome} onPress={() => router.push('/')}>
        <Text style={styles.btnHomeText}>Volver al inicio</Text>
      </TouchableOpacity>

      <Text style={styles.auto}>Volviendo al inicio en 8 segundos...</Text>

    </View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', padding: 28, alignItems: 'center', justifyContent: 'center', gap: 16 },
  iconWrap: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  iconSuccess: { backgroundColor: '#0a2a1a' },
  iconDanger: { backgroundColor: '#2a0a0a' },
  iconEmoji: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#8888aa', textAlign: 'center' },
  badge: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 24 },
  badgeSuccess: { backgroundColor: '#0a2a1a' },
  badgeDanger: { backgroundColor: '#2a0a0a' },
  badgeText: { fontSize: 14, fontWeight: '600' },
  badgeTextSuccess: { color: '#22cc66' },
  badgeTextDanger: { color: '#ff4455' },
  card: { width: '100%', backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: '#2a2a4a' },
  cardDanger: { width: '100%', backgroundColor: '#2a0a0a', borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: '#441111', gap: 12 },
  dangerText: { fontSize: 13, color: '#cc8888', lineHeight: 20 },
  retryBtn: { backgroundColor: '#3355ff', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#2a2a4a' },
  rowLabel: { fontSize: 13, color: '#8888aa' },
  rowValue: { fontSize: 13, color: '#fff', fontWeight: '500' },
  btnHome: { width: '100%', backgroundColor: '#1a1a2e', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 0.5, borderColor: '#2a2a4a' },
  btnHomeText: { color: '#8888aa', fontSize: 14 },
  auto: { fontSize: 11, color: '#444466' },
});