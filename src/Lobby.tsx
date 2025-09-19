import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { BeatLoader } from "react-spinners";
import { socket } from "./webrtc";
import mapImage from "./assets/map_level_one_export.png";
import mapWalls from "./assets/walls_map_level_one_export.png";
import mapBox from "./assets/box_map_level_one_export.png";
import mapBox2 from "./assets/box2_map_level_one_export.png";
import mapLadder from "./assets/ladder_map_level_one_export.png";
import mapVase from "./assets/vase_map_level_one_export.png";
import mapBox3 from "./assets/box3_map_level_one_export.png";
import mapChest from "./assets/chest_map_level_one_export.png";

import "./Lobby.css";

type ObstacleType =
  | "walls"
  | "box"
  | "box2"
  | "ladder"
  | "vase"
  | "box3"
  | "chest";

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
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  const [showDefeatModal, setShowDefeatModal] = useState<boolean>(false);
  const [timerData, setTimerData] = useState<{ minutes: number; seconds: number; isRunning: boolean } | null>(null);

  const [myObstacles, setMyObstacles] = useState<ObstacleType[]>([]);
  const [currentObstacleIndex, setCurrentObstacleIndex] = useState<number>(0);
  const [unityPlayerPosition, setUnityPlayerPosition] = useState<{ x: number; y: number; pseudo: string } | null>(null);

  const [roomId] = useState<string>(state?.roomId || "");

  const mapByObstacle: Record<ObstacleType, string> = {
    walls: mapWalls,
    box: mapBox,
    box2: mapBox2,
    ladder: mapLadder,
    vase: mapVase,
    box3: mapBox3,
    chest: mapChest,
  };

  const currentObstacle = myObstacles.length > 0 ? myObstacles[currentObstacleIndex] : null;
  const displayedMap = currentObstacle ? mapByObstacle[currentObstacle] : mapImage;

  useEffect(() => {
    if (!roomId) {
      navigate("/", { state: { error: "Aucune salle trouvée" } });
      return;
    }

    setShowModal(true);

    socket.emit("room:join", { roomId });

    socket.on("room:players", (list: any[]) => {
      setPlayers(list);
      const current = list.find((p) => p.socketId === socket.id);
      if (current) {
        setCurrentPlayer(current.pseudo);
      }
    });

    socket.on("game:started", () => {
      console.log(players);
    });

    const onObstaclesAssigned = ({ obstacleTypes, totalObstacles }: { obstacleTypes: ObstacleType[]; totalObstacles: number }) => {
      setMyObstacles(obstacleTypes);
      setCurrentObstacleIndex(0); 
      console.log(` Reçu ${totalObstacles} obstacles:`, obstacleTypes);
    };

    const onPlayerPositionUpdate = (data: {
      socketId: string;
      pseudo: string;
      position: { x: number; y: number };
      timestamp: number
    }) => {
      setUnityPlayerPosition({
        x: data.position.x,
        y: data.position.y,
        pseudo: data.pseudo
      });
    };

    const onGameVictory = () => {
      setShowVictoryModal(true);
    };

    const onTimerUpdate = (data: { minutes: number; seconds: number; isRunning: boolean }) => {
      setTimerData(data);
      if (data.minutes === 0 && data.seconds === 0) {
        setShowDefeatModal(true);
      }
    };

    socket.on("obstacles:assigned", onObstaclesAssigned);
    socket.on("player:position:update", onPlayerPositionUpdate);
    socket.on("game:victory", onGameVictory);
    socket.on("timer:update", onTimerUpdate);

    return () => {
      socket.off("room:players");
      socket.off("obstacles:assigned", onObstaclesAssigned);
      socket.off("player:position:update", onPlayerPositionUpdate);
      socket.off("game:victory", onGameVictory);
      socket.off("timer:update", onTimerUpdate);
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
      }
    );
  };

  const quitLobby = () => {
    if (roomId) {
      socket.emit("room:leave", { roomId });
    }
    socket.disconnect();
    navigate("/");
  };

  const handleVictoryQuit = () => {
    setShowVictoryModal(false);
    if (roomId) {
      socket.emit("room:leave", { roomId });
    }
    socket.disconnect();
    navigate("/");
  };

  const handleDefeatClose = () => {
    setShowDefeatModal(false);
  };

  return (
    <div className="lobby-layout">
      <div className="unity-zone">
        <div className="unity-label">Carte du jeu</div>
        <div className="unity-viewport">
          <img src={displayedMap} alt="Carte du jeu" className="game-map-image" />
          {unityPlayerPosition && (
            <div
              className="player-marker"
              style={{
                left: `${unityPlayerPosition.x * 100}%`,
                top: `${unityPlayerPosition.y * 100}%`,
              }}
            >
              <div className="marker-dot"></div>
              <div className="marker-label">{unityPlayerPosition.pseudo}</div>
            </div>
          )}
        </div>
      </div>

      <div className="interface-zone">
        <div className="header-section">
          <div className="player-name-display">{currentPlayer || "Anonyme"}</div>
          <div className="room-id-display">{roomId}</div>
        </div>

        <div className="players-list-section">
          <div className="players-list-title">Joueurs connectés</div>
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

        {myObstacles.length > 0 && (
          <div className="obstacles-section">
            <div className="obstacles-title">
              Mes obstacles ({myObstacles.length})
              {myObstacles.length > 1 && (
                <span className="obstacle-counter">
                  {currentObstacleIndex + 1}/{myObstacles.length}
                </span>
              )}
            </div>
            <div className="obstacles-list">
              {myObstacles.map((obstacle, index) => (
                <div
                  key={obstacle}
                  className={`obstacle-item ${index === currentObstacleIndex ? 'obstacle-active' : ''}`}
                  title={`Obstacle ${index + 1}: ${obstacle}`}
                  onClick={() => setCurrentObstacleIndex(index)}
                >
                  {obstacle.toUpperCase()}
                </div>
              ))}
            </div>
            {myObstacles.length > 1 && (
              <div className="obstacle-navigation">
                <button 
                  className="nav-button"
                  onClick={() => setCurrentObstacleIndex((prev) => (prev - 1 + myObstacles.length) % myObstacles.length)}
                >
                  ← Précédent
                </button>
                <button 
                  className="nav-button"
                  onClick={() => setCurrentObstacleIndex((prev) => (prev + 1) % myObstacles.length)}
                >
                  Suivant →
                </button>
              </div>
            )}
          </div>
        )}

        <div className="quit-timer-container">
          {timerData && (
            <div className={`timer-box ${!timerData.isRunning ? 'timer-stopped' : ''}`}>
              {String(timerData.minutes).padStart(2, '0')}:{String(timerData.seconds).padStart(2, '0')}
            </div>
          )}
          <button onClick={quitLobby} className="quit-button">
            🚪 Quitter le lobby
          </button>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pseudo-title">
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
              💡 Astuce : ton pseudo sera valide pour cette session.
            </p>
          </div>
        </div>
      )}

      {showVictoryModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" style={{ backgroundColor: 'rgba(0, 150, 0, 0.8)' }}>
          <div className="modal-content" style={{ backgroundColor: '#2e7d32', color: 'white' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏆</h2>
            <h3>Félicitations !</h3>
            <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>
              Vous avez gagné !
            </p>
            <div className="modal-buttons">
              <button onClick={handleVictoryQuit} className="validate-button" style={{ backgroundColor: '#4caf50' }}>
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      {showDefeatModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" style={{ backgroundColor: 'rgba(150, 0, 0, 0.8)' }}>
          <div className="modal-content" style={{ backgroundColor: '#b91c1c', color: 'white' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏰</h2>
            <h3>Ah pas de chance !</h3>
            <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>
              Le chrono est arrivé à zéro. Tu feras mieux la prochaine fois !
            </p>
            <div className="modal-buttons">
              <button onClick={handleDefeatClose} className="validate-button" style={{ backgroundColor: '#ef4444' }}>
                OK
              </button>
            </div>
          </div>
        </div>

      )}
    </div>
  );
}

export default Lobby;
