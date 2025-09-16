import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { BeatLoader } from "react-spinners";
import { socket } from "./webrtc";
import mapImage from "./assets/map_level_one_export.png";
import "./Lobby.css";

function Lobby() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as { players?: any[]; roomId?: string } | undefined;
  const initialPlayers = state?.players || [];

  const [players, setPlayers] = useState<any[]>(initialPlayers);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [pseudoInput, setPseudoInput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [currentPlayer, setCurrentPlayer] = useState<string>("");
  const [unityPlayerPosition, setUnityPlayerPosition] = useState<{ x: number; y: number; pseudo: string; timestamp: number } | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });

  const [roomId] = useState<string>(
    state?.roomId || localStorage.getItem("roomId") || ""
  );

  // Fonction pour calculer les dimensions de la map
  const updateMapDimensions = () => {
    if (mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      setMapDimensions({ width: rect.width, height: rect.height });
    }
  };

  useEffect(() => {
    if (!roomId) {
      navigate("/", { state: { error: "Aucune salle trouvée" } });
      return;
    }

    localStorage.setItem("roomId", roomId);
    setShowModal(true);

    socket.emit("room:join", { roomId });

    socket.on("room:players", (list: any[]) => {
      setPlayers(list);
      const current = list.find((p) => p.socketId === socket.id);
      if (current) {
        setCurrentPlayer(current.pseudo);
      }
    });

    // ecouter les mises à jour de position du joueur Unity
    socket.on("player:position:update", (data: { socketId: string; pseudo: string; position: { x: number; y: number }; timestamp: number }) => {
      setUnityPlayerPosition({
        x: data.position.x,
        y: data.position.y,
        pseudo: data.pseudo,
        timestamp: data.timestamp
      });
    });

    // Mettre à jour les dimensions de la map au chargement et au redimensionnement
    setTimeout(updateMapDimensions, 100); 
    window.addEventListener('resize', updateMapDimensions);

    return () => {
      socket.off("room:players");
      socket.off("player:position:update");
      window.removeEventListener('resize', updateMapDimensions);
    };
  }, [roomId, navigate]);

  const submitPseudo = () => {
    const p = pseudoInput.trim();
    if (!p) {
      setError("Entrez un pseudo.");
      return;
    }
    setError("");

    socket.emit(
      "player:create",
      p,
      (ack?: { ok: boolean; pseudo?: string; error: string }) => {
        if (!ack?.ok) {
          if (ack?.error === "Room non trouvée pour ce joueur") {
            navigate("/", { state: { error: ack?.error } });
            return;
          }
          setError("Pseudo déjà pris. Réessaie.");
          return;
        }

        setCurrentPlayer(p);
        setShowModal(false);
        localStorage.setItem("pseudo", p);
      }
    );
  };

  // 🚪 Quitter le lobby
  const quitLobby = () => {
    if (roomId) {
      socket.emit("room:leave", { roomId });
    }
    socket.disconnect();
    localStorage.removeItem("roomId");
    localStorage.removeItem("pseudo");
    navigate("/");
  };

  return (
    <div className="lobby-layout">
      <div className="unity-zone">
        <div className="unity-label">Vue spectateur - Position du joueur Unity</div>
        <div className="unity-viewport" ref={mapRef}>
          <img 
            src={mapImage} 
            alt="Carte du jeu" 
            className="game-map-image" 
            onLoad={updateMapDimensions}
          />
          {/* Afficher la position du joueur Unity */}
          {unityPlayerPosition && mapDimensions.width > 0 && mapDimensions.height > 0 && (
            <div
              className="player-marker unity-player-marker"
              style={{
                position: 'absolute',
                left: `${unityPlayerPosition.x * mapDimensions.width}px`,
                top: `${unityPlayerPosition.y * mapDimensions.height}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                pointerEvents: 'none'
              }}
              title={`${unityPlayerPosition.pseudo} (Unity) - ${(unityPlayerPosition.x * 100).toFixed(1)}%, ${(unityPlayerPosition.y * 100).toFixed(1)}%`}
            >
              <div className="marker-dot">
                <span className="marker-initial">
                  {unityPlayerPosition.pseudo.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="marker-pulse"></div>
            </div>
          )}
        </div>
      </div>

      <div className="interface-zone">
        <div className="header-section">
          <div className="player-name-display">
            {currentPlayer || "Anonyme"}
          </div>
          <div className="room-id-display">{roomId}</div>
          <div className="spectator-status">
             Mode Spectateur
          </div>
          {unityPlayerPosition && (
            <div className="unity-player-info">
               Joueur Unity: {unityPlayerPosition.pseudo}
              <br />
              📍 Position: {(unityPlayerPosition.x * 100).toFixed(1)}%, {(unityPlayerPosition.y * 100).toFixed(1)}%
            </div>
          )}
        </div>

        <div className="players-list-section">
          <div className="players-list-title">Spectateurs connectés</div>
          <div className="players-vertical-list">
            {players.map((player) => (
              <div
                key={player.socketId}
                className={`player-circle ${
                  player.socketId === socket.id ? "current-player" : ""
                }`}
                title={player.pseudo || "Anonyme"}
              >
                {!player.pseudo ||
                player.pseudo.toLowerCase() === "anonyme" ? (
                  <BeatLoader size={4} color="white" />
                ) : (
                  <span className="player-initial">
                    {player.pseudo.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button onClick={quitLobby} className="quit-button">
            🚪 Quitter le lobby
          </button>
        </div>
      </div>

      {showModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pseudo-title"
        >
          <div className="modal-content">
            <h3 id="pseudo-title">Choisis ton pseudo</h3>
            <input
              autoFocus
              type="text"
              placeholder="Votre pseudo"
              value={pseudoInput}
              onChange={(e) => setPseudoInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPseudo()}
              className="pseudo-input"
            />
            {error && <p className="error-message">{error}</p>}
            <div className="modal-buttons">
              <button onClick={submitPseudo} className="validate-button">
                Valider
              </button>
            </div>
            <p className="modal-hint">
              💡 Astuce : ton pseudo sera mémorisé pour ce lobby.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lobby;
