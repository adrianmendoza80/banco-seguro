import { Platform } from 'react-native';

export async function registrarNotificaciones(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const Notifications = await import('expo-notifications');
  const Device = await import('expo-device');

  if (!Device.default.isDevice) return null;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export async function enviarNotificacionLocal(titulo: string, cuerpo: string) {
  if (Platform.OS === 'web') {
    // En web usar la API nativa del navegador
    if ('Notification' in window) {
      const permission = await window.Notification.requestPermission();
      if (permission === 'granted') {
        new window.Notification(titulo, { body: cuerpo });
      }
    }
    return;
  }

  const Notifications = await import('expo-notifications');
  await Notifications.scheduleNotificationAsync({
    content: { title: titulo, body: cuerpo, sound: true },
    trigger: { type: 'timeInterval', seconds: 1, repeats: false } as any,
  });
}