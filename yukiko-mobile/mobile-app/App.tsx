import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, StatusBar, KeyboardAvoidingView, Platform,
  Animated, Image, Dimensions, ActivityIndicator, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFonts, Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';

// ── Config ───────────────────────────────────────────────────
const WS_URL = 'ws://YOUR_HOMELAB_IP:3002'; // Cambiar por IP real

// ── Theme ────────────────────────────────────────────────────
const theme = {
  bg: '#0a0a0f',
  bgCard: '#12121a',
  bgInput: '#1a1a26',
  border: '#2a2a3d',
  accent: '#c084fc',      // purple
  accentSoft: '#a855f7',
  accentGlow: '#7c3aed22',
  pink: '#f472b6',
  blue: '#60a5fa',
  text: '#e8e8f0',
  textSub: '#8888aa',
  textDim: '#555577',
  success: '#34d399',
  error: '#f87171',
  yukiko: '#c084fc',
  user: '#60a5fa',
};

const { width: SCREEN_W } = Dimensions.get('window');

// ── Types ────────────────────────────────────────────────────
type MessageType = 'message' | 'image' | 'gif' | 'error' | 'pong' | 'auth_ok' | 'auth_fail' | 'user';

interface Message {
  id: string;
  type: MessageType;
  text?: string;
  url?: string;
  caption?: string;
  sender: 'yukiko' | 'user';
  timestamp: Date;
}

// ── Avatar ───────────────────────────────────────────────────
const YukikoAvatar = ({ size = 32 }: { size?: number }) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    <LinearGradient
      colors={['#c084fc', '#7c3aed']}
      style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
    />
    <Text style={{ fontSize: size * 0.45, textAlign: 'center' }}>❄️</Text>
  </View>
);

// ── Message Bubble ───────────────────────────────────────────
const Bubble = ({ msg }: { msg: Message }) => {
  const isYukiko = msg.sender === 'yukiko';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isYukiko ? -20 : 20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const bubbleColor = isYukiko ? theme.bgCard : theme.bgInput;
  const borderColor = isYukiko ? theme.accent + '44' : theme.blue + '33';

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        isYukiko ? styles.bubbleRowLeft : styles.bubbleRowRight,
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
      ]}
    >
      {isYukiko && <YukikoAvatar size={28} />}
      <View style={[
        styles.bubble,
        { backgroundColor: bubbleColor, borderColor, maxWidth: SCREEN_W * 0.72 },
        isYukiko ? styles.bubbleLeft : styles.bubbleRight,
        msg.type === 'error' && styles.bubbleError,
      ]}>
        {msg.type === 'image' || msg.type === 'gif' ? (
          <TouchableOpacity onPress={() => msg.url && Linking.openURL(msg.url)}>
            <Image
              source={{ uri: msg.url }}
              style={styles.msgImage}
              resizeMode="cover"
            />
            {msg.caption && (
              <Text style={[styles.msgText, styles.imgCaption]}>{msg.caption}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <Text style={[
            styles.msgText,
            msg.type === 'error' && styles.msgTextError,
            msg.type === 'auth_ok' && styles.msgTextSuccess,
          ]}>
            {msg.text}
          </Text>
        )}
        <Text style={styles.msgTime}>
          {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </Animated.View>
  );
};

// ── Command Suggestions ──────────────────────────────────────
const QUICK_COMMANDS = [
  { label: '💰 balance', cmd: '/balance' },
  { label: '🎁 daily', cmd: '/daily' },
  { label: '🤖 ask', cmd: '/ask ' },
  { label: '🎨 imagine', cmd: '/imagine ' },
  { label: '🎭 hug', cmd: '/hug' },
  { label: '📊 stats', cmd: '/stats' },
  { label: '❓ help', cmd: '/help' },
  { label: '🔗 accounts', cmd: '/accounts' },
];

// ── Auth Screen ──────────────────────────────────────────────
const AuthScreen = ({ onAuth }: { onAuth: (name: string, username: string) => void }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <LinearGradient colors={[theme.bg, '#0d0a1a', theme.bg]} style={styles.authContainer}>
      <Animated.View style={[styles.authLogo, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient
          colors={['#c084fc', '#7c3aed', '#4c1d95']}
          style={styles.authLogoGradient}
        >
          <Text style={styles.authLogoEmoji}>❄️</Text>
        </LinearGradient>
      </Animated.View>

      <Text style={styles.authTitle}>Yukiko</Text>
      <Text style={styles.authSubtitle}>Tu compañera digital</Text>

      <View style={styles.authForm}>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Nombre</Text>
          <TextInput
            style={styles.authInput}
            value={name}
            onChangeText={setName}
            placeholder="¿Cómo te llamas?"
            placeholderTextColor={theme.textDim}
            autoCapitalize="words"
          />
        </View>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Username (opcional)</Text>
          <TextInput
            style={styles.authInput}
            value={username}
            onChangeText={setUsername}
            placeholder="@username"
            placeholderTextColor={theme.textDim}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.authButton, !name.trim() && styles.authButtonDisabled]}
          onPress={() => name.trim() && onAuth(name.trim(), username.trim())}
          disabled={!name.trim()}
        >
          <LinearGradient
            colors={['#c084fc', '#7c3aed']}
            style={styles.authButtonGradient}
          >
            <Text style={styles.authButtonText}>Entrar 🌸</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Text style={styles.authFooter}>Yukiko Mobile · v1.0</Text>
    </LinearGradient>
  );
};

// ── Main Chat ────────────────────────────────────────────────
export default function App() {
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [showAuth, setShowAuth] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name: string; username: string; token: string } | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    const newMsg: Message = {
      ...msg,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const connect = useCallback((token: string, name: string, username: string) => {
    setConnecting(true);
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      setConnected(true);
      setConnecting(false);
      // Auth
      socket.send(JSON.stringify({
        type: 'auth',
        token,
        displayName: name,
        username: username || undefined,
      }));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'pong') return;
        if (msg.type === 'auth_ok') {
          setAuthed(true);
          setShowAuth(false);
        }
        addMessage({ type: msg.type, text: msg.text, url: msg.url, caption: msg.caption, sender: 'yukiko' });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch { /* ignore */ }
    };

    socket.onclose = () => {
      setConnected(false);
      setAuthed(false);
      setConnecting(false);
      // Reconnect after 5s
      reconnectTimer.current = setTimeout(() => {
        if (userInfo) connect(userInfo.token, userInfo.name, userInfo.username);
      }, 5000);
    };

    socket.onerror = () => {
      setConnecting(false);
    };

    ws.current = socket;

    // Ping every 30s
    const pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      socket.close();
    };
  }, [userInfo, addMessage]);

  const handleAuth = useCallback(async (name: string, username: string) => {
    // Generate or retrieve token
    let token = await AsyncStorage.getItem('yukiko_token');
    if (!token) {
      token = `mob_${Math.random().toString(36).substr(2, 16)}_${Date.now()}`;
      await AsyncStorage.setItem('yukiko_token', token);
    }
    const info = { name, username, token };
    setUserInfo(info);
    await AsyncStorage.setItem('yukiko_user', JSON.stringify(info));
    connect(token, name, username);
  }, [connect]);

  // Load saved user on start
  useEffect(() => {
    AsyncStorage.getItem('yukiko_user').then(saved => {
      if (saved) {
        const info = JSON.parse(saved);
        setUserInfo(info);
        setShowAuth(false);
        connect(info.token, info.name, info.username);
      }
    });
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, []);

  const sendCommand = useCallback(() => {
    if (!input.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

    const text = input.trim();
    addMessage({ type: 'user', text, sender: 'user' });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (text.startsWith('/')) {
      const parts = text.slice(1).split(' ');
      const command = parts[0];
      const args = parts.slice(1);
      ws.current.send(JSON.stringify({ type: 'command', command, args }));
    } else {
      // Treat as /ask
      ws.current.send(JSON.stringify({ type: 'command', command: 'ask', args: [text] }));
    }

    setInput('');
    setShowSuggestions(false);
  }, [input, addMessage]);

  if (!fontsLoaded) return null;

  if (showAuth) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
        <AuthScreen onAuth={handleAuth} />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      {/* Header */}
      <LinearGradient colors={[theme.bgCard, theme.bg + 'aa']} style={styles.header}>
        <YukikoAvatar size={38} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>Yukiko</Text>
          <View style={styles.headerStatus}>
            <View style={[styles.statusDot, { backgroundColor: connected ? theme.success : theme.error }]} />
            <Text style={styles.headerStatusText}>
              {connecting ? 'Conectando...' : connected ? 'En línea' : 'Desconectada'}
            </Text>
          </View>
        </View>
        {connecting && <ActivityIndicator size="small" color={theme.accent} />}
      </LinearGradient>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => <Bubble msg={item} />}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌸</Text>
            <Text style={styles.emptyText}>¡Hola! Soy Yukiko.</Text>
            <Text style={styles.emptySubtext}>Escríbeme algo o usa un comando.</Text>
          </View>
        }
      />

      {/* Quick Commands */}
      {showSuggestions && (
        <View style={styles.suggestions}>
          <FlatList
            data={QUICK_COMMANDS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={c => c.cmd}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionChip}
                onPress={() => {
                  setInput(item.cmd);
                  if (!item.cmd.endsWith(' ')) {
                    setShowSuggestions(false);
                  }
                }}
              >
                <Text style={styles.suggestionText}>{item.label}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          />
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.cmdButton}
            onPress={() => setShowSuggestions(v => !v)}
          >
            <Text style={styles.cmdButtonText}>/</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe un mensaje o /comando..."
            placeholderTextColor={theme.textDim}
            multiline
            maxLength={500}
            onSubmitEditing={sendCommand}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || !connected) && styles.sendButtonDisabled]}
            onPress={sendCommand}
            disabled={!input.trim() || !connected}
          >
            <LinearGradient
              colors={input.trim() && connected ? ['#c084fc', '#7c3aed'] : [theme.bgInput, theme.bgInput]}
              style={styles.sendButtonGradient}
            >
              <Text style={styles.sendButtonText}>↑</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },

  // Auth
  authContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  authLogo: { marginBottom: 24 },
  authLogoGradient: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  authLogoEmoji: { fontSize: 48 },
  authTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 42, color: theme.text, letterSpacing: -1 },
  authSubtitle: { fontFamily: 'Nunito_400Regular', fontSize: 16, color: theme.textSub, marginBottom: 40 },
  authForm: { width: '100%', gap: 16 },
  inputWrapper: { gap: 6 },
  inputLabel: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: theme.textSub, marginLeft: 4 },
  authInput: {
    backgroundColor: theme.bgInput, borderRadius: 14, padding: 16,
    color: theme.text, fontFamily: 'Nunito_400Regular', fontSize: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  authButton: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  authButtonDisabled: { opacity: 0.4 },
  authButtonGradient: { padding: 18, alignItems: 'center' },
  authButtonText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: '#fff' },
  authFooter: { position: 'absolute', bottom: 32, fontFamily: 'Nunito_400Regular', fontSize: 12, color: theme.textDim },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: theme.text },
  headerStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  headerStatusText: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: theme.textSub },

  // Messages
  messageList: { padding: 16, gap: 12, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 4 },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubble: {
    padding: 12, borderRadius: 18, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  bubbleLeft: { borderBottomLeftRadius: 4 },
  bubbleRight: { borderBottomRightRadius: 4, borderColor: theme.blue + '33' },
  bubbleError: { borderColor: theme.error + '44' },
  msgText: { fontFamily: 'Nunito_400Regular', fontSize: 15, color: theme.text, lineHeight: 22 },
  msgTextError: { color: theme.error },
  msgTextSuccess: { color: theme.success },
  msgTime: { fontFamily: 'Nunito_400Regular', fontSize: 10, color: theme.textDim, marginTop: 4, textAlign: 'right' },
  msgImage: { width: SCREEN_W * 0.6, height: SCREEN_W * 0.6, borderRadius: 12, marginBottom: 6 },
  imgCaption: { fontSize: 12, color: theme.textSub },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontFamily: 'Nunito_700Bold', fontSize: 20, color: theme.text, marginBottom: 8 },
  emptySubtext: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: theme.textSub },

  // Suggestions
  suggestions: {
    backgroundColor: theme.bgCard, borderTopWidth: 1, borderTopColor: theme.border,
    paddingVertical: 10,
  },
  suggestionChip: {
    backgroundColor: theme.bgInput, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: theme.border,
  },
  suggestionText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: theme.accent },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, paddingBottom: 24,
    backgroundColor: theme.bgCard, borderTopWidth: 1, borderTopColor: theme.border,
  },
  cmdButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: theme.bgInput,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border,
  },
  cmdButtonText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: theme.accent },
  input: {
    flex: 1, backgroundColor: theme.bgInput, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, maxHeight: 120,
    color: theme.text, fontFamily: 'Nunito_400Regular', fontSize: 15,
    borderWidth: 1, borderColor: theme.border,
  },
  sendButton: { borderRadius: 20, overflow: 'hidden' },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonGradient: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sendButtonText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 20, color: '#fff' },
});
