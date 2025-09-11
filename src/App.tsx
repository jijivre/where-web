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
        audioBitsPerSecond: 64000
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

      mediaRecorder.start(100);
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

    setIsStreaming(false);

    if (playerName) {
      socket.emit('streamEnd', { from: playerName });
    }
  };

  const playAudioChunk = (audioData: string) => {
    try {
      const audio = new Audio(audioData);
      audio.play().catch(err => console.error('Erreur lecture audio:', err));
    } catch (err) {
      console.error('Erreur création audio:', err);
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