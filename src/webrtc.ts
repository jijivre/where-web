import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:3001");

let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteAudio: HTMLAudioElement | null = null;

export const initCall = async (audioElement: HTMLAudioElement) => {
  remoteAudio = audioElement;

  pc = new RTCPeerConnection();

  pc.ontrack = (event) => {
    if (remoteAudio) {
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.play().catch(console.error);
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("webrtc-candidate", event.candidate);
    }
  };

  socket.on("webrtc-offer", async (offer) => {
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("webrtc-answer", answer);
  });

  socket.on("webrtc-answer", async (answer) => {
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on("webrtc-candidate", async (candidate) => {
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Erreur ajout candidate", err);
    }
  });

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  localStream.getTracks().forEach((track) => {
    pc?.addTrack(track, localStream!);
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("webrtc-offer", offer);
};

export const endCall = () => {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  if (pc) {
    pc.close();
    pc = null;
  }
  console.log("📴 Appel terminé");
};

export { socket };