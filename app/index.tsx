import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { enviarNotificacionLocal, registrarNotificaciones } from '../lib/notifications';

export default function HomeScreen() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animación de pulso
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    // Vibración
    setTimeout(() => Vibration.vibrate([0, 200, 100, 200]), 800);

    // Registrar notificaciones y simular alerta de acceso
    const init = async () => {
      await registrarNotificaciones();
      await enviarNotificacionLocal(
        '🏦 Banco Seguro',
        'Se detectó un intento de acceso. ¿Sos vos?'
      );
    };
    init();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.bankName}>🏦 BANCO SEGURO</Text>
      <Text style={styles.bankSub}>Control de acceso biométrico</Text>

      <Animated.View style={[styles.card, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.cardTitle}>🔐 Banco Seguro</Text>
        <Text style={styles.cardTime}>Ahora mismo</Text>
        <Text style={styles.cardBody}>
          Se detectó un intento de acceso a una sucursal. ¿Sos vos?
        </Text>
        <View style={styles.locationTag}>
          <Text style={styles.locationText}>📍 Sucursal Centro — Buenos Aires</Text>
        </View>
      </Animated.View>

      <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/scan')}>
        <Text style={styles.btnPrimaryText}>Soy yo — verificar identidad →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push('/result?authorized=false')}>
        <Text style={styles.btnSecondaryText}>No fui yo — bloquear acceso</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnAdmin} onPress={() => router.push('/registro')}>
        <Text style={styles.btnAdminText}>⚙️ Panel de administrador</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', padding: 24, justifyContent: 'center', gap: 16 },
  bankName: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', letterSpacing: 1 },
  bankSub: { fontSize: 12, color: '#8888aa', textAlign: 'center' },
  card: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2a2a4a', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  cardTime: { fontSize: 11, color: '#8888aa' },
  cardBody: { fontSize: 14, color: '#ccccdd', lineHeight: 20 },
  locationTag: { backgroundColor: '#0e2a4a', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, alignSelf: 'flex-start' },
  locationText: { fontSize: 12, color: '#5599cc' },
  btnPrimary: { backgroundColor: '#3355ff', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnSecondary: { backgroundColor: 'transparent', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 0.5, borderColor: '#444466' },
  btnSecondaryText: { color: '#8888aa', fontSize: 14 },
  btnAdmin: { backgroundColor: '#1a1a2e', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 0.5, borderColor: '#3355ff' },
  btnAdminText: { color: '#3355ff', fontSize: 13 },
});