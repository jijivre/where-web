import { useState } from 'react';
import { socket } from './webrtc';
import './App.css';
import { useLocation, useNavigate } from 'react-router';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const errorLobby =
    (location.state as { error?: string } | undefined)?.error || '';

  const [pin, setPin] = useState('');
  const [error, setError] = useState(errorLobby);

  const onValid = () => {
    setError('');

    if (!socket.connected) {
      socket.connect();
    }

    const roomId = pin.trim().toUpperCase();
    if (!roomId) {
      setError('Veuillez entrer un ID de connexion');
      return;
    }

    socket.emit(
      'room:join',
      { roomId },
      (res?: { ok: boolean; error?: string; players?: string[] }) => {
        if (!res?.ok) {
          setError(res?.error || 'PIN invalide');
          return;
        }

        navigate('/lobby', {
          state: {
            players: res.players ?? [],
            roomId,
          },
        });
      }
    );
  };

  return (
    <div className="mainForm">
      <div className="header">
        <img src="./where-logo.png" className="logo" />
      </div>
      <div className="form">
        <p className="error">{error}</p>
        <input
          type="text"
          placeholder="Entrez un code PIN"
          onChange={(e) => setPin(e.target.value)}
          value={pin}
        />
        <input type="submit" onClick={onValid} value={'Connect !'} />
        <button onClick={() => navigate('/call')}>Call</button>
      </div>
    </div>
  );
}

export default App;