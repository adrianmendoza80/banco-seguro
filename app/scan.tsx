import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BACKEND_URL = 'http://localhost:3001';

export default function ScanScreen() {
  const router = useRouter();
  const [status, setStatus] = useState('Posicioná tu rostro en el círculo');
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    if (Platform.OS === 'web') {
      startWebCamera();
    } else {
      if (permission?.granted) {
        setCameraReady(true);
        setStatus('Cámara lista — presioná Iniciar');
      } else {
        requestPermission();
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: any) => track.stop());
      }
    };
  }, [permission]);

  const startWebCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 240, height: 240 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraReady(true);
        setStatus('Cámara lista — presioná Iniciar');
      }
    } catch {
      setStatus('No se pudo acceder a la cámara');
    }
  };

  const capturarFotoWeb = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = 240;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -240, 0, 240, 240);
    ctx.restore();
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const capturarFotoNativa = async (): Promise<string | null> => {
    if (!cameraRef.current) return null;
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      if (photo?.base64) return `data:image/jpeg;base64,${photo.base64}`;
      if (photo?.uri) return photo.uri;
      return null;
    } catch {
      return null;
    }
  };

  const startScan = async () => {
    setScanning(true);
    const steps = [
      { msg: '🔍 Detectando puntos faciales...', pct: 20 },
      { msg: '📐 Midiendo distancias biométricas...', pct: 45 },
      { msg: '🔒 Comparando con base de datos...', pct: 70 },
      { msg: '✅ Confirmando identidad...', pct: 90 },
      { msg: '✅ Verificación completa', pct: 100 },
    ];
    let i = 0;
    const run = async () => {
      if (i >= steps.length) {
        try {
          // Capturar foto según plataforma
          let fotoBase64: string | null = null;
          if (Platform.OS === 'web') {
            fotoBase64 = capturarFotoWeb();
          } else {
            fotoBase64 = await capturarFotoNativa();
          }

          const response = await fetch(`${BACKEND_URL}/verificar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fotoBase64 }),
          });
          const data = await response.json();

          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track: any) => track.stop());
          }
          setTimeout(() => router.push(`/result?authorized=${data.autorizado}&confidence=${data.confianza}&name=${encodeURIComponent(data.nombre ?? 'Desconocido')}`), 500);
        } catch {
          setTimeout(() => router.push(`/result?authorized=false&confidence=0&name=Error`), 500);
        }
        return;
      }
      setStatus(steps[i].msg);
      Animated.timing(progressAnim, { toValue: steps[i].pct / 100, duration: 500, useNativeDriver: false }).start();
      i++;
      setTimeout(run, 700);
    };
    run();
  };

  const scanLineY = scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, 100] });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => {
        if (streamRef.current) streamRef.current.getTracks().forEach((t: any) => t.stop());
        router.back();
      }}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Verificación facial</Text>
      <Text style={styles.subtitle}>Mirá directo a la cámara</Text>

      <View style={styles.frameWrap}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />

          {Platform.OS === 'web' ? (
            <>
              {/* @ts-ignore */}
              <video
                ref={videoRef}
                style={{ width: 240, height: 240, objectFit: 'cover', borderRadius: 120, transform: 'scaleX(-1)' }}
                autoPlay muted playsInline
              />
              {/* @ts-ignore */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </>
          ) : permission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={styles.nativeCamera}
              facing="front"
              onCameraReady={() => {
                setCameraReady(true);
                setStatus('Cámara lista — presioná Iniciar');
              }}
            />
          ) : (
            <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
              <Text style={styles.permText}>📷 Dar permiso de cámara</Text>
            </TouchableOpacity>
          )}

          {scanning && (
            <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]} />
          )}
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: cameraReady ? '#22cc66' : '#ff4455' }]} />
        <Text style={styles.statusText}>{cameraReady ? 'Cámara activa' : 'Iniciando cámara...'}</Text>
      </View>

      <Text style={styles.stepMsg}>{status}</Text>

      {scanning && (
        <View style={styles.progressWrap}>
          <Animated.View style={[styles.progressBar, {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
          }]} />
        </View>
      )}

      {!scanning && (
        <TouchableOpacity
          style={[styles.btnScan, !cameraReady && { opacity: 0.5 }]}
          onPress={startScan}
          disabled={!cameraReady}
        >
          <Text style={styles.btnScanText}>Iniciar escaneo facial</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', padding: 24, alignItems: 'center', gap: 14 },
  back: { alignSelf: 'flex-start', marginTop: 40 },
  backText: { color: '#5577ff', fontSize: 14 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 13, color: '#8888aa' },
  frameWrap: { marginVertical: 10 },
  frame: {
    width: 240, height: 240,
    borderRadius: 120,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  nativeCamera: { width: 240, height: 240 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#3366ff', borderWidth: 3, zIndex: 10 },
  tl: { top: 16, left: 16, borderRightWidth: 0, borderBottomWidth: 0, borderRadius: 4 },
  tr: { top: 16, right: 16, borderLeftWidth: 0, borderBottomWidth: 0, borderRadius: 4 },
  bl: { bottom: 16, left: 16, borderRightWidth: 0, borderTopWidth: 0, borderRadius: 4 },
  br: { bottom: 16, right: 16, borderLeftWidth: 0, borderTopWidth: 0, borderRadius: 4 },
  permBtn: { alignItems: 'center', padding: 16 },
  permText: { color: '#3355ff', fontSize: 13, textAlign: 'center' },
  scanLine: { position: 'absolute', width: 200, height: 2, backgroundColor: 'rgba(50,150,255,0.8)', borderRadius: 1, zIndex: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 14, color: '#ccccdd' },
  stepMsg: { fontSize: 13, color: '#8888aa' },
  progressWrap: { width: '100%', backgroundColor: '#1a1a2e', borderRadius: 20, height: 8, overflow: 'hidden' },
  progressBar: { height: 8, backgroundColor: '#3355ff', borderRadius: 20 },
  btnScan: { width: '100%', backgroundColor: '#3355ff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnScanText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});