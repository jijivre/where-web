import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:3001");

function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [connectedGuides, setConnectedGuides] = useState<string[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('🔗 Connecté au serveur');
    });

    socket.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('audioChunk', (data) => {
      playAudioChunk(data.audio);
    });

    socket.on('streamStart', (data) => {
      setMessages((prev) => [...prev, `🔴 ${data.from} commence à parler...`]);
      initAudioContext();
    });

    socket.on('streamEnd', (data) => {
      setMessages((prev) => [...prev, `⚫ ${data.from} s'est arrêté`]);
    });

    socket.on('guidesUpdate', (guides) => {
      setConnectedGuides(guides);
    });

    return () => {
      socket.off('connect');
      socket.off('message');
      socket.off('audioChunk');
      socket.off('streamStart');
      socket.off('streamEnd');
      socket.off('guidesUpdate');

      stopStreaming();
    };
  }, []);

  const initAudioContext = async () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      nextStartTimeRef.current = audioContextRef.current.currentTime;
    }
    return audioContextRef.current;
  };

  const connectAsGuide = () => {
    if (playerName.trim()) {
      socket.emit('joinAsGuide', playerName);
    }
  };

  const sendMessage = () => {
    if (message.trim() && playerName) {
      socket.emit('message', `${playerName}: ${message}`);
      setMessage('');
    }
  };

  const startStreaming = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            socket.emit('audioChunk', {
              from: playerName,
              audio: reader.result
            });
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Chunks de 250ms pour avoir des fichiers audio valides
      mediaRecorder.start(250);
      setIsStreaming(true);
      socket.emit('streamStart', { from: playerName });

    } catch (err) {
      console.error('❌ Erreur accès micro:', err);
      alert('Impossible d\'accéder au microphone');
    }
  };

  const stopStreaming = () => {
    if (mediaRecorderRef.current && isStreaming) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsStreaming(false);

    if (playerName) {
      socket.emit('streamEnd', { from: playerName });
    }
  };

  const playAudioChunk = async (audioData: string) => {
    try {
      const audioContext = await initAudioContext();

      // Convertir base64 en ArrayBuffer
      const response = await fetch(audioData);
      const arrayBuffer = await response.arrayBuffer();

      // Décoder l'audio
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Programmer la lecture pour éviter les gaps
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      const currentTime = audioContext.currentTime;
      const startTime = Math.max(currentTime, nextStartTimeRef.current);

      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

    } catch (err) {
      console.error('Erreur lecture audio:', err);
      nextStartTimeRef.current = audioContextRef.current?.currentTime || 0;
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <h1>🎤 Guide Vocal Streaming pour Unity</h1>

      {!playerName ? (
        <div style={{ textAlign: 'center', marginTop: 30 }}>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Votre nom de guide"
            style={{ padding: 10, marginRight: 10, fontSize: 16 }}
            onKeyPress={(e) => e.key === 'Enter' && connectAsGuide()}
          />
          <button
            onClick={connectAsGuide}
            style={{
              padding: 10,
              fontSize: 16,
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 5
            }}
          >
            Se connecter
          </button>
        </div>
      ) : (
        <div>
          <div style={{
            marginBottom: 20,
            padding: 10,
            background: '#f0f0f0',
            borderRadius: 5
          }}>
            <strong>👋 Connecté en tant que: {playerName}</strong>
            {connectedGuides.length > 1 && (
              <div style={{ marginTop: 5, fontSize: 14, color: '#666' }}>
                Autres guides: {connectedGuides.filter(g => g !== playerName).join(', ')}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <button
              onClick={isStreaming ? stopStreaming : startStreaming}
              style={{
                padding: '15px 30px',
                fontSize: 18,
                background: isStreaming ? '#f44336' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: 50,
                cursor: 'pointer',
                transition: 'all 0.3s',
                userSelect: 'none'
              }}
            >
              {isStreaming ? '🔴 Arrêter le stream' : '🎤 Démarrer le stream'}
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message texte..."
              style={{
                padding: 10,
                width: '70%',
                marginRight: 10,
                border: '1px solid #ddd',
                borderRadius: 5
              }}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={sendMessage}
              style={{
                padding: 10,
                background: '#2196F3',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 5
              }}
            >
              Envoyer
            </button>
          </div>

          <div style={{
            height: 300,
            overflowY: 'scroll',
            border: '1px solid #ddd',
            padding: 10,
            background: '#fafafa',
            borderRadius: 5
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Messages:</h3>
            {messages.length === 0 ? (
              <div style={{ color: '#999', fontStyle: 'italic' }}>
                Aucun message pour le moment...
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{
                  marginBottom: 5,
                  padding: 5,
                  background: msg.includes('🔴') || msg.includes('⚫') ? '#e3f2fd' : 'white',
                  borderRadius: 3,
                  fontSize: 14
                }}>
                  {msg}
                </div>
              ))
            )}
          </div>

          <div style={{
            marginTop: 10,
            fontSize: 12,
            color: '#666',
            textAlign: 'center'
          }}>
            {connectedGuides.length} guide(s) connecté(s) •
            {isStreaming ? ' 🔴 Streaming en cours...' : ' ⚪ Prêt à streamer'}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;