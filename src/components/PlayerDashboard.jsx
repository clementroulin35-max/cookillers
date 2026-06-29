import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useGame } from "../context/GameContext";
import { supabase } from "../services/supabaseClient";
import Leaderboard, { getRank } from "./Leaderboard";
import { AlertCircle, Eye, EyeOff, HelpCircle, Send, Plus, Minus, Camera, X, LogOut } from "lucide-react";
import tombstoneZombie from "../../DA/Sans_titre_1-removebg-preview.png";
import mascotteLogo from "../../DA/mascotte_logo_app.png";
import headerTitle from "../../DA/header_title.png";
import { vibrateLight, vibrateMedium, vibrateSuccess, vibrateFailure, vibrateDeath } from "../utils/haptic";

const FOUNTAIN_POOL = [
  // Actions Faciles (Tier 1) — gain 0.5
  { type: "action", tier: 1, title: "Faire un compliment sincère à un inconnu.", gain: 0.5 },
  { type: "action", tier: 1, title: "Boire un verre d'eau cul-sec en public.", gain: 0.5 },
  { type: "action", tier: 1, title: "Ranger 3 déchets qui traînent par terre.", gain: 0.5 },
  { type: "action", tier: 1, title: "Lancer une partie de 'Je n'ai jamais...' au camp avec au moins 3 personnes.", gain: 0.5 },
  { type: "action", tier: 1, title: "Désigner un 'Maître du Pouce' : chaque fois que tu poses ton pouce sur la table, tout le monde doit faire de même.", gain: 0.5 },
  { type: "action", tier: 1, title: "Faire un bras de fer avec un autre joueur.", gain: 0.5 },
  // Actions Moyennes (Tier 2) — gain 1.5
  { type: "action", tier: 2, title: "Raconter une blague nulle à un groupe d'inconnus.", gain: 1.5 },
  { type: "action", tier: 2, title: "Faire un check de la main créatif avec quelqu'un.", gain: 1.5 },
  { type: "action", tier: 2, title: "Parler pendant 5 minutes avec un accent étranger.", gain: 1.5 },
  { type: "action", tier: 2, title: "Remplir un verre au milieu de la table, puis défier quelqu'un au Shifumi.", gain: 1.5 },
  { type: "action", tier: 2, title: "Inventer une règle absurde pour le camp pendant 30 min.", gain: 1.5 },
  { type: "action", tier: 2, title: "Réussir un 'Flip Cup' 3 fois de suite.", gain: 1.5 },
  // Actions Difficiles (Tier 3) — gain 3.0
  { type: "action", tier: 3, title: "Chanter le refrain d'une chanson connue en plein milieu du camp.", gain: 3.0 },
  { type: "action", tier: 3, title: "Faire une séance de 10 pompes devant une scène.", gain: 3.0 },
  { type: "action", tier: 3, title: "Convaincre un inconnu de te faire un massage de 15 secondes.", gain: 3.0 },
  { type: "action", tier: 3, title: "Défier un voisin de tente à un duel de 'Bière Pong'.", gain: 3.0 },
  { type: "action", tier: 3, title: "Faire une 'cascade' avec au moins 4 personnes où chacun boit consécutivement.", gain: 3.0 },
  // Vérités Faciles (Tier 1) — gain 0.5
  { type: "verite", tier: 1, title: "Quelle est ta chanson préférée honteuse ?", gain: 0.5 },
  { type: "verite", tier: 1, title: "Quel est ton pire défaut en festival ?", gain: 0.5 },
  { type: "verite", tier: 1, title: "As-tu déjà menti pour éviter de boire un verre ?", gain: 0.5 },
  { type: "verite", tier: 1, title: "Quel est le surnom le plus ridicule qu'on t'ait jamais donné ?", gain: 0.5 },
  { type: "verite", tier: 1, title: "Si tu devais échanger ton corps avec un joueur ici, qui choisirais-tu ?", gain: 0.5 },
  { type: "verite", tier: 1, title: "Quelle est la pire excuse que tu as sortie pour annuler une soirée ?", gain: 0.5 },
  // Vérités Moyennes (Tier 2) — gain 1.5
  { type: "verite", tier: 2, title: "Quel joueur ici présent a le style vestimentaire le plus douteux ?", gain: 1.5 },
  { type: "verite", tier: 2, title: "Quelle est la chose la plus absurde que tu aies faite en festival ?", gain: 1.5 },
  { type: "verite", tier: 2, title: "As-tu déjà fait semblant de connaître un groupe de musique ?", gain: 1.5 },
  { type: "verite", tier: 2, title: "Qui dans ce groupe serait le premier à se faire arrêter par la police ?", gain: 1.5 },
  { type: "verite", tier: 2, title: "Quel est ton plus grand plaisir coupable inavouable ?", gain: 1.5 },
  { type: "verite", tier: 2, title: "As-tu déjà eu un crush secret sur un(e) ami(e) d'un joueur présent ?", gain: 1.5 },
  // Vérités Difficiles (Tier 3) — gain 3.0
  { type: "verite", tier: 3, title: "Quel joueur du groupe as-tu le plus envie d'éliminer et pourquoi ?", gain: 3.0 },
  { type: "verite", tier: 3, title: "As-tu un secret inavouable que personne ici ne connaît ?", gain: 3.0 },
  { type: "verite", tier: 3, title: "Quelle est ta pire phobie ou situation embarrassante vécue au camping ?", gain: 3.0 },
  { type: "verite", tier: 3, title: "Si tu devais avouer un énorme mensonge dit à un joueur du groupe, ce serait quoi ?", gain: 3.0 },
  { type: "verite", tier: 3, title: "Quelle est la pire bêtise que tu aies commise sous l'effet de l'alcool ?", gain: 3.0 },
  { type: "verite", tier: 3, title: "Si ta vie amoureuse était un film, quel en serait le titre ?", gain: 3.0 },
];

const getRandomFountainChallenge = (requestedType, tier, actionPool) => {
  const dbType = requestedType === "action" ? "fountain_action" : "fountain_truth";
  const targetGain = tier === 3 ? 3.0 : tier === 2 ? 1.5 : 0.5;
  if (actionPool && actionPool.length > 0) {
    const available = actionPool.filter(a => a.type === dbType && Number(a.damagePenalty) === targetGain);
    if (available.length > 0) {
      const selected = available[Math.floor(Math.random() * available.length)];
      return { title: selected.title, desc: selected.description, gain: Number(selected.damagePenalty), id: selected.id };
    }
    const fallbackList = actionPool.filter(a => a.type === dbType);
    if (fallbackList.length > 0) {
      const selected = fallbackList[Math.floor(Math.random() * fallbackList.length)];
      return { title: selected.title, desc: selected.description, gain: Number(selected.damagePenalty), id: selected.id };
    }
  }
  const available = FOUNTAIN_POOL.filter(p => p.tier === tier && p.type === requestedType);
  if (available.length === 0) {
    const allHardcoded = FOUNTAIN_POOL.filter(p => p.type === requestedType);
    return allHardcoded[Math.floor(Math.random() * allHardcoded.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
};

const AnimatedScore = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current === value) return;
    
    const startVal = displayValue;
    const endVal = value;
    prevValueRef.current = value;

    let startTimestamp = null;
    const duration = 1000; 
    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // cubic easeOut
      const currentVal = Math.round(startVal + easeProgress * (endVal - startVal));
      
      setDisplayValue(currentVal);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value]);

  return <span>{displayValue}</span>;
};

const CampfireAvatar = ({ p, idx, total, isMe, campPhoto, radarClass, handleAvatarDragEnd, getPlayerDisplayName, campfireContainerRef }) => {
  const angle = (idx * 2 * Math.PI) / Math.max(1, total);
  const radiusX = 38; 
  const radiusY = 25; 
  const left = 50 + radiusX * Math.cos(angle);
  const top = 50 + radiusY * Math.sin(angle);

  return (
    <div
      style={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        transform: "translate(-50%, -50%)",
        width: "48px",
        height: "48px",
        zIndex: 10,
        pointerEvents: "none"
      }}
    >
      <motion.div
        key={p.name}
        className={`campfire-avatar-bubble ${radarClass}`}
        data-player={p.name}
        drag={!isMe}
        dragConstraints={campfireContainerRef}
        dragElastic={0.1}
        dragMomentum={false}
        dragSnapToOrigin={false}
        onDragEnd={(event, info) => {
          handleAvatarDragEnd(p, info);
        }}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          border: `2px solid ${p.isZombie ? "var(--color-zombie)" : (p.isFrozen ? "var(--color-cyan)" : "#000")}`,
          backgroundColor: p.isZombie ? "rgba(74, 222, 128, 0.2)" : (p.isFrozen ? "rgba(34, 211, 238, 0.2)" : "#3a3463"),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.95rem",
          fontWeight: "bold",
          cursor: isMe ? "default" : "grab",
          pointerEvents: "auto",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none"
        }}
        title={p.displayName || p.name}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          {campPhoto ? (
            <img src={campPhoto} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
          ) : (
            <span style={{ pointerEvents: "none" }}>
              {p.displayName ? p.displayName.slice(0, 2).toUpperCase() : p.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        {p.isFrozen && (
          <span style={{ position: "absolute", bottom: "-4px", right: "-4px", fontSize: "0.95rem", zIndex: 12, pointerEvents: "none" }}>❄️</span>
        )}
        {p.isZombie && (
          <span style={{ position: "absolute", bottom: "-4px", right: "-4px", fontSize: "0.95rem", zIndex: 12, pointerEvents: "none" }}>🧟</span>
        )}
        <span style={{
          position: "absolute",
          top: "52px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "0.7rem",
          fontStyle: "italic",
          color: "#ffffff",
          textShadow: "1px 1px 0 #000",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          zIndex: 15
        }}>
          {getPlayerDisplayName(p.name)}
        </span>
      </motion.div>
    </div>
  );
};

export default function PlayerDashboard() {
  const {
    currentUser,
    gameCode,
    gameState,
    isOnline,
    toastMessage,
    skipMission,
    abandonTarget,
    declareHit,
    launchCounterAttack,
    submitFountainProof,
    suggestAction,
    freezePlayer,
    unfreezePlayer,
    updatePlayerPhoto,
    getPlayerPhoto,
    logOut,
    manualRefresh,
    offlineQueue,
    showToast
  } = useGame();

  const player = gameState.players.find(p => currentUser && p.name.toUpperCase() === currentUser.toUpperCase());
  const targetPlayerObj = player && player.target ? gameState.players.find(p => p.name.toUpperCase() === player.target.toUpperCase()) : null;
  const isTargetFrozen = targetPlayerObj ? targetPlayerObj.isFrozen : false;

  const getPlayerDisplayName = (username) => {
    if (!username) return "";
    if (username.toUpperCase() === "GM") return "GM";
    if (username.toUpperCase() === "SYSTEM") return "System";
    const found = gameState.players.find(p => p.name.toUpperCase() === username.toUpperCase());
    const raw = found ? (found.displayName || found.name) : username;
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  };

  // Onglets : 'contrat', 'source', 'suggestion', 'classement'
  const [activeTab, setActiveTab] = useState("contrat");
  const [isMasked, setIsMasked] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [targetPhoto, setTargetPhoto] = useState(null);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [showFountainModal, setShowFountainModal] = useState(false);
  const [showSkipConfirmModal, setShowSkipConfirmModal] = useState(false);
  const [showZombieFountainModal, setShowZombieFountainModal] = useState(false);
  const [showZombieBiteConfirmModal, setShowZombieBiteConfirmModal] = useState(false);
  const [revealPin, setRevealPin] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const campfireContainerRef = useRef(null);
  const fireRef = useRef(null);
  
  // États de l'aide contextuelle
  const [isHelpActive, setIsHelpActive] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Mode réduction performances
  const [lowPerfMode, setLowPerfMode] = useState(() => {
    return localStorage.getItem("cookillers_low_perf") === "true";
  });

  // Parallaxe souris/gyroscope
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });

  // Inputs formulaires
  const [counterSuspect, setCounterSuspect] = useState("");
  const [counterAction, setCounterAction] = useState("");
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestDesc, setSuggestDesc] = useState("");
  const [suggestReward, setSuggestReward] = useState(100);
  const [suggestDamage, setSuggestDamage] = useState(1.5);
  const [suggestType, setSuggestType] = useState("mission"); // 'mission', 'fountain_action', 'fountain_truth'
  
  // Fontaine
  const [fountainType, setFountainType] = useState("verite"); // 'action' ou 'verite'
  const [fountainTextProof, setFountainTextProof] = useState("");
  const [fountainPhotoProof, setFountainPhotoProof] = useState("");
  const [fountainChoice, setFountainChoice] = useState(null); // défi pioché

  const [floatingScore, setFloatingScore] = useState(null); // { amount: number, id: number }
  const prevScoreRef = useRef(player ? player.score : 0);

  const scoreVal = player ? player.score : 0;
  useEffect(() => {
    if (scoreVal > prevScoreRef.current) {
      const diff = scoreVal - prevScoreRef.current;
      setFloatingScore({ amount: diff, id: Date.now() });
      setTimeout(() => {
        setFloatingScore(null);
      }, 1800);
    }
    prevScoreRef.current = scoreVal;
  }, [scoreVal]);

  // Zombie victime selection
  const [zombieVictim, setZombieVictim] = useState("");
  const [campPhotos, setCampPhotos] = useState({}); // { name: photoBase64 }

  // Charger les photos de profil des joueurs présents au campement
  useEffect(() => {
    if (gameState.players) {
      gameState.players.forEach(p => {
        if (p.hasPhoto && !campPhotos[p.name]) {
          getPlayerPhoto(p.name).then(photo => {
            if (photo) {
              setCampPhotos(prev => ({ ...prev, [p.name]: photo }));
            }
          }).catch(err => console.error("Erreur photo campement :", err));
        }
      });
    }
  }, [gameState.players, getPlayerPhoto, campPhotos]);

  const [triggerScreenShake, setTriggerScreenShake] = useState(false);
  const [showRedFlash, setShowRedFlash] = useState(false);
  const [cookieConfettiActive, setCookieConfettiActive] = useState(false);

  const triggerVibration = (pattern) => {
    if (lowPerfMode) return; // Pas de vibration en mode économie / perf réduite
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        console.warn("Haptic feedback non supporté :", err);
      }
    }
  };

  const triggerDamageEffect = () => {
    if (lowPerfMode) return;
    setTriggerScreenShake(true);
    setShowRedFlash(true);
    setTimeout(() => {
      setTriggerScreenShake(false);
      setShowRedFlash(false);
    }, 300);
  };

  const triggerCookieExplosion = () => {
    if (lowPerfMode) return;
    setCookieConfettiActive(true);
    setTimeout(() => {
      setCookieConfettiActive(false);
    }, 2000);
  };

  const prevStats = useRef({
    lives: player?.lives,
    isZombie: player?.isZombie,
    kills: player?.statKillsCount,
    successCounters: player?.statSuccessfulCounterattacks,
    failedCounters: player?.statFailedCounterattacks
  });

  useEffect(() => {
    if (!player) return;
    
    // Pour éviter de déclencher l'effet au tout premier rendu ou reconnexion vide
    if (prevStats.current.lives === undefined) {
      prevStats.current = {
        lives: player.lives,
        isZombie: player.isZombie,
        kills: player.statKillsCount,
        successCounters: player.statSuccessfulCounterattacks,
        failedCounters: player.statFailedCounterattacks
      };
      return;
    }

    const prev = prevStats.current;

    // Détecter passage Zombie
    if (player.isZombie && !prev.isZombie) {
      triggerVibration(800);
    }

    // Détecter neutralisation cible
    if (player.statKillsCount > prev.kills) {
      triggerVibration([100, 50, 100]);
      triggerCookieExplosion();
    }

    // Détecter contre-attaque réussie
    if (player.statSuccessfulCounterattacks > prev.successCounters) {
      triggerVibration([50, 50, 100, 50, 150]);
    }

    // Détecter fausse accusation (statFailedCounterattacks a augmenté)
    if (player.statFailedCounterattacks > prev.failedCounters) {
      triggerVibration([100, 50, 100, 50, 100]);
      triggerDamageEffect();
    } else if (player.lives < prev.lives) {
      // Perte de vie générale (ex: morsure zombie subie)
      triggerVibration(200);
      triggerDamageEffect();
    }

    // Mettre à jour la ref
    prevStats.current = {
      lives: player.lives,
      isZombie: player.isZombie,
      kills: player.statKillsCount,
      successCounters: player.statSuccessfulCounterattacks,
      failedCounters: player.statFailedCounterattacks
    };
  }, [player, lowPerfMode]);

  // Mascotte sarcastique
  const [mascotteQuote, setMascotteQuote] = useState("");
  const [showMascotte, setShowMascotte] = useState(false);

  useEffect(() => {
    localStorage.setItem("cookillers_low_perf", lowPerfMode ? "true" : "false");
  }, [lowPerfMode]);

  // Charger la photo de profil dès le départ ou changement du joueur
  useEffect(() => {
    if (player && player.hasPhoto) {
      getPlayerPhoto(player.name).then(photo => {
        setProfilePhoto(photo);
      }).catch(err => {
        console.error("Erreur de chargement photo profil :", err);
      });
    } else {
      setProfilePhoto(null);
    }
  }, [player?.name, player?.hasPhoto, getPlayerPhoto]);

  // Charger la photo de la cible en tâche de fond
  useEffect(() => {
    if (player && player.target) {
      getPlayerPhoto(player.target).then(photo => {
        setTargetPhoto(photo);
      }).catch(err => {
        console.error("Erreur chargement photo cible :", err);
      });
    } else {
      setTargetPhoto(null);
    }
  }, [player?.target, getPlayerPhoto]);

  // Charger la photo de la cible zombie
  useEffect(() => {
    if (player?.isZombie && zombieVictim) {
      getPlayerPhoto(zombieVictim).then(photo => {
        setTargetPhoto(photo);
      }).catch(err => {
        console.error("Erreur chargement photo victime zombie :", err);
      });
    } else if (player?.isZombie) {
      setTargetPhoto(null);
    }
  }, [zombieVictim, player?.isZombie, getPlayerPhoto]);

  // Mascotte quotes
  const quotes = [
    "Psst... tu as pensé à regarder derrière toi ? (Juste au cas où).",
    "Le Grand Juge dort à moitié sur sa console. C'est le moment d'assassiner en douce.",
    "Faire une fausse accusation ? Oui, c'est idéal si tu veux mourir plus vite.",
    "Mordre un survivant n'est pas poli, mais c'est excellent pour ta décomposition.",
    "Ce festival est plein de cookies savoureux... et de cibles faciles.",
    "Ne fais pas cette tête, perdre un cœur est juste une étape vers le Mode Moisi !"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setMascotteQuote(quotes[Math.floor(Math.random() * quotes.length)]);
        setShowMascotte(true);
        setTimeout(() => setShowMascotte(false), 6000);
      }
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Parallaxe souris (Hub)
  useEffect(() => {
    if (lowPerfMode) return;
    const handleMouseMove = (e) => {
      const x = (e.clientX - window.innerWidth / 2) / 30;
      const y = (e.clientY - window.innerHeight / 2) / 30;
      setParallaxOffset({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [lowPerfMode]);

  if (!player) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        color: "#fff",
        gap: "12px",
        backgroundColor: "#0d0a1b"
      }}>
        <span className="animate-spin" style={{ fontSize: "2rem" }}>🍪</span>
        <span style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem" }}>Chargement du profil...</span>
      </div>
    );
  }

  const isZombie = player.isZombie;
  const currentAction = gameState.actionPool.find(a => a.id === player.actionId);
  const myKiller = gameState.players.find(p => p.target && p.target.toUpperCase() === player.name.toUpperCase());

  // Vérifier si un arbitrage est déjà en cours dans l'historique
  const pendingHit = gameState.history.find(
    h => h.playerName && h.playerName.toUpperCase() === player.name.toUpperCase() && h.status === "pending" && h.type === "hit_declared"
  );
  const pendingCounter = gameState.history.find(
    h => h.playerName && h.playerName.toUpperCase() === player.name.toUpperCase() && h.status === "pending" && h.type === "counter_attack_pending"
  );

  // ECG Line color based on health
  let ecgClass = "";
  if (isZombie) ecgClass = "ecg-zombie";
  else if (player.lives < 2.0) ecgClass = "ecg-danger";
  else if (player.lives < 4.0) ecgClass = "ecg-medium";

  // Déterminer la rareté du défi
  let rarityClass = "card-common";
  let rarityLabel = "Commun";
  if (currentAction) {
    if (currentAction.scoreReward >= 400) {
      rarityClass = "card-legendary";
      rarityLabel = "Légendaire";
    } else if (currentAction.scoreReward >= 200) {
      rarityClass = "card-elite";
      rarityLabel = "Élite";
    } else if (currentAction.scoreReward >= 100) {
      rarityClass = "card-standard";
      rarityLabel = "Standard";
    }
  }

  // Gérer la photo
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updatePlayerPhoto(player.name, reader.result);
      setProfilePhoto(reader.result);
      showToast("Photo de profil mise à jour avec succès ! 📸");
    };
    reader.readAsDataURL(file);
  };

  // Soumission Déclaration Meurtre
  const confirmZombieBite = () => {
    const zombieAction = currentAction || { title: "Morsure Zombie", scoreReward: 50, damagePenalty: 1.0 };
    declareHit(zombieVictim, zombieAction.title, 50, 1.0);
    showToast("Morsure déclarée au Grand Juge ! 🧟");
    setShowZombieBiteConfirmModal(false);
  };

  const handleHitSubmit = () => {
    if (pendingHit) return;

    if (isZombie) {
      if (!zombieVictim) {
        showToast("Veuillez sélectionner une victime à mordre ! 🧟");
        return;
      }
      setShowZombieBiteConfirmModal(true);
    } else {
      const targetDisplayName = getPlayerDisplayName(player.target);
      if (window.confirm(`Es-tu sûr d'avoir exécuté le contrat sur ${targetDisplayName} ? Cette action enverra la preuve au Juge.`)) {
        declareHit(player.target, currentAction.title, currentAction.scoreReward, currentAction.damagePenalty);
        showToast("Neutralisation envoyée au Grand Juge !");
      }
    }
  };

  // Soumission Contre-Attaque
  const handleCounterAttack = () => {
    if (!counterSuspect || !counterAction) {
      showToast("Formulaire incomplet !");
      return;
    }
    launchCounterAttack(counterSuspect, counterAction);
    setShowCounterModal(false);
    setCounterAction("");
    showToast("Accusation lancée auprès des Juges. Croisez les doigts.");
  };

  const handleAvatarDragEnd = (p, info) => {
    const fireRect = fireRef.current?.getBoundingClientRect();
    const avatarEls = document.querySelectorAll(".campfire-avatar-bubble");
    
    let droppedEl = null;
    avatarEls.forEach(el => {
      if (el.getAttribute("data-player") === p.name) {
        droppedEl = el;
      }
    });

    if (fireRect) {
      const dragX = info.point.x;
      const dragY = info.point.y;
      const inFire = (
        dragX >= fireRect.left &&
        dragX <= fireRect.right &&
        dragY >= fireRect.top &&
        dragY <= fireRect.bottom
      );

      if (inFire) {
        // Reset positions back to orbit
        setResetKey(prev => prev + 1);

        if (p.isZombie) {
          showToast("Tu es déjà mort, personne ne veut plus ta peau. 🧟");
          vibrateFailure();
        } else if (p.isFrozen) {
          showToast("Tu es exfiltré, personne ne peut te prendre pour cible. ❄️");
          vibrateFailure();
        } else {
          setCounterSuspect(p.name);
          setShowCounterModal(true);
          vibrateMedium();
        }
        return;
      }
    }

    // Spacing check to avoid overlaps when dropped outside
    if (droppedEl) {
      const droppedRect = droppedEl.getBoundingClientRect();
      const droppedCX = droppedRect.left + droppedRect.width / 2;
      const droppedCY = droppedRect.top + droppedRect.height / 2;

      avatarEls.forEach(otherEl => {
        if (otherEl === droppedEl) return;
        const otherRect = otherEl.getBoundingClientRect();
        const otherCX = otherRect.left + otherRect.width / 2;
        const otherCY = otherRect.top + otherRect.height / 2;

        const dx = otherCX - droppedCX;
        const dy = otherCY - droppedCY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = 52; // 48px avatar width + margin

        if (dist < minDist) {
          const angle = dist > 0 ? Math.atan2(dy, dx) : Math.random() * 2 * Math.PI;
          const pushDist = minDist - dist;
          const pushX = pushDist * Math.cos(angle);
          const pushY = pushDist * Math.sin(angle);

          const style = window.getComputedStyle(otherEl);
          const matrix = new DOMMatrix(style.transform);
          otherEl.style.transform = `translate(${matrix.m41 + pushX}px, ${matrix.m42 + pushY}px)`;
        }
      });
    }
  };

  // Helper pour piocher / récupérer le couple Action / Vérité de la Fontaine de façon persistante
  const getOrCreateFountainPair = () => {
    if (!player) return null;
    const key = `fountain_pair_${player.name}_${gameCode}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Erreur lors de la lecture du cache du couple Fontaine :", e);
      }
    }
    // Génération d'un nouveau couple conjointe (Action & Vérité) pour le Tier adapté du joueur
    const tier = player.fountainTotalUses >= 5 ? 3 : player.fountainTotalUses >= 3 ? 2 : 1;
    const actionCh = getRandomFountainChallenge("action", tier, gameState.actionPool);
    const veriteCh = getRandomFountainChallenge("verite", tier, gameState.actionPool);
    const newPair = { action: actionCh, verite: veriteCh };
    localStorage.setItem(key, JSON.stringify(newPair));
    return newPair;
  };

  // Soumission Fontaine
  const handleFountainSubmit = () => {
    if (fountainType === "verite" && !fountainTextProof) {
      showToast("La vérité exige une confession écrite !");
      return;
    }
    if (fountainType === "action" && !fountainPhotoProof) {
      showToast("Une action exige une preuve photo !");
      return;
    }

    const proof = fountainType === "verite" ? fountainTextProof : fountainPhotoProof;
    const gain = fountainChoice.gain;

    submitFountainProof(fountainType, proof, gain);
    // Nettoyer le couple du cache local après validation réussie
    if (player) {
      localStorage.removeItem(`fountain_pair_${player.name}_${gameCode}`);
    }
    setFountainChoice(null);
    setFountainTextProof("");
    setFountainPhotoProof("");
    setShowFountainModal(false);
    showToast("Soins appliqués ! Preuve stockée pour audit public. ⛲");
  };

  // Puiser un défi de la fontaine (Action ou Vérité)
  const handleFountainDraw = (requestedType) => {
    const pair = getOrCreateFountainPair();
    if (!pair) return;
    const challenge = requestedType === "action" ? pair.action : pair.verite;
    setFountainChoice(challenge);
    setFountainType(requestedType);
  };

  // Relance de défi de la fontaine
  const handleFountainRefresh = async () => {
    if (player.fountainRefreshesToday < 1) {
      showToast("Plus de jetons de relance 🌀 pour la Fontaine aujourd'hui.");
      return;
    }

    const { error } = await supabase.rpc("refresh_fountain_challenge_transaction", {
      p_game_code: gameCode,
      p_name: player.name,
      p_new_title: "",
      p_new_desc: "",
      p_new_type: ""
    });

    if (error) {
      showToast(`Erreur : ${error.message}`);
    } else {
      // Regénérer simultanément l'Action et la Vérité pour le nouveau tirage (le couple entier change !)
      const tier = player.fountainTotalUses >= 5 ? 3 : player.fountainTotalUses >= 3 ? 2 : 1;
      const actionCh = getRandomFountainChallenge("action", tier, gameState.actionPool);
      const veriteCh = getRandomFountainChallenge("verite", tier, gameState.actionPool);
      const newPair = { action: actionCh, verite: veriteCh };
      localStorage.setItem(`fountain_pair_${player.name}_${gameCode}`, JSON.stringify(newPair));

      const challenge = fountainType === "action" ? actionCh : veriteCh;
      setFountainChoice(challenge);
      setFountainPhotoProof("");
      setFountainTextProof("");
      manualRefresh();
      showToast("Nouveau défi de la Source pioché ! 🌀");
    }
  };

  const handleSuggestSubmit = () => {
    if (suggestType === "mission" && !suggestTitle) {
      showToast("Titre requis !");
      return;
    }
    if (!suggestDesc) {
      showToast("Description requise !");
      return;
    }
    const finalTitle = suggestType === "mission" ? suggestTitle : (suggestDesc.slice(0, 35) + "...");
    const encodedDesc = suggestType + "|" + suggestDesc;
    const finalReward = suggestType === "mission" ? suggestReward : 0;
    suggestAction(finalTitle, encodedDesc, finalReward, suggestDamage);
    setSuggestTitle("");
    setSuggestDesc("");
    setSuggestType("mission");
    setSuggestReward(100);
    setSuggestDamage(1.5);
    showToast("Suggestion soumise en arbitrage au Grand Juge. Merci ! 💡");
  };

  // Helper pour afficher les tooltips
  const triggerTooltip = (id) => {
    if (!isHelpActive) return;
    setActiveTooltip(activeTooltip === id ? null : id);
  };

  return (
    <div className={`app-container ${isZombie ? "zombie-mode" : ""} ${triggerScreenShake ? "screen-shake" : ""}`} style={{ paddingBottom: "75px" }}>
      
      {/* Flash Rouge sur Dégâts */}
      {showRedFlash && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(239, 68, 68, 0.25)",
          zIndex: 999999,
          pointerEvents: "none"
        }} />
      )}

      {/* Pluie de Cookies (Particules de Confettis) */}
      {cookieConfettiActive && Array.from({ length: 18 }).map((_, idx) => {
        const animationNum = (idx % 6) + 1; // fly-1 à fly-6
        const rotationStart = (idx * 20) % 360;
        const scale = 0.5 + (idx % 4) * 0.2; // 0.5, 0.7, 0.9, 1.1
        const delay = (idx * 0.05).toFixed(2);
        return (
          <div
            key={idx}
            className="cookie-particle"
            style={{
              animation: `cookie-fly-${animationNum} 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both`,
              animationDelay: `${delay}s`,
              transform: `rotate(${rotationStart}deg) scale(${scale})`
            }}
          >
            🍪
          </div>
        );
      })}

      {isZombie && !lowPerfMode && <div className="vhs-glitch-overlay" />}

      {/* Header global */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 16px",
        backgroundColor: "rgba(18, 16, 30, 0.8)",
        borderBottom: "3px solid #000",
        position: "sticky",
        top: 0,
        zIndex: 500
      }}>
        {/* Avatar cliquable pour modale matricule */}
        <div 
          onClick={() => setShowProfileModal(true)}
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            border: "2px solid #000",
            boxShadow: "2px 2px 0 #000",
            backgroundColor: "#221f3b",
            overflow: "hidden",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {profilePhoto ? (
            <img src={profilePhoto} alt="Profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontFamily: "var(--font-title)", fontSize: "0.9rem" }}>
              {(player.displayName || player.name).slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Logo mini */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={headerTitle} alt="Cookillers" style={{ height: "45px", maxWidth: "160px", objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Bouton d'aide contextuelle */}
          <button
            type="button"
            onClick={() => {
              setIsHelpActive(!isHelpActive);
              setActiveTooltip(null);
              if (!isHelpActive) {
                showToast("Aide Active. Cliquez sur les points d'interrogation.");
              }
            }}
            style={{
              background: "none",
              border: "none",
              color: isHelpActive ? "var(--color-cyan)" : "#fff",
              cursor: "pointer"
            }}
          >
            <HelpCircle size={24} />
          </button>

          {/* Bouton de déconnexion */}
          <button
            type="button"
            onClick={() => {
              if (confirm("Voulez-vous vraiment quitter le salon ?")) {
                logOut();
              }
            }}
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              display: "flex",
              alignItems: "center"
            }}
            title="Se déconnecter"
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* Onde ECG de Vitalité */}
      {(() => {
        let ecgColor = "#22c55e"; // vert
        if (isZombie) ecgColor = "#6b7280"; // gris
        else if (player.lives < 2.0) ecgColor = "#ef4444"; // rouge
        else if (player.lives < 4.0) ecgColor = "#f97316"; // orange

        return (
          <div 
            className="ecg-container" 
            style={{ margin: "4px 10px", height: "30px", borderRadius: "8px", "--ecg-base-color": ecgColor }} 
            onClick={() => triggerTooltip("ecg")}
          >
            <div className={`ecg-line ${ecgClass}`} />
            {isHelpActive && (
              <div style={{ position: "absolute", left: "6px", top: "4px", backgroundColor: "var(--color-cyan)", color: "#000", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}>?</div>
            )}
            {activeTooltip === "ecg" && (
              <div onClick={() => setActiveTooltip(null)} style={{ position: "fixed", bottom: "90px", left: "16px", right: "16px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "12px", borderRadius: "12px", zIndex: 1000, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>
                <strong>Constantes Vitales :</strong> Si vos cœurs ❤️ tombent à 0, vous décédez et passez zombie 🧟 (Mode Moisi).
              </div>
            )}
          </div>
        );
      })()}

      {/* Barre de Vitalité & Biscuits standardisée */}
      <div data-tuto="vitalite" style={{ display: "flex", justifyContent: "space-between", padding: "4px 12px", alignItems: "center" }}>
        {/* Vitalité ❤️ */}
        <div 
          onClick={() => triggerTooltip("health")}
          style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", position: "relative" }}
        >
          <span style={{ fontSize: "1.4rem" }}>❤️</span>
          <span style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem", textShadow: "1.5px 1.5px 0 #000" }}>
            {player.lives}
          </span>
          {isHelpActive && (
            <div style={{ backgroundColor: "var(--color-cyan)", color: "#000", borderRadius: "50%", width: "12px", height: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: "bold" }}>?</div>
          )}
          {activeTooltip === "health" && (
            <div onClick={() => setActiveTooltip(null)} style={{ position: "fixed", bottom: "90px", left: "16px", right: "16px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "12px", borderRadius: "12px", zIndex: 1000, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>
              Votre vitalité ❤️. Un combat trop long vous épuise.
            </div>
          )}
        </div>

        {/* Biscuits 🪙 */}
        <div 
          onClick={() => triggerTooltip("biscuits")}
          style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", position: "relative" }}
        >
          <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.8rem", height: "1.8rem", verticalAlign: "middle", display: "inline-block" }} />
          <span style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem", textShadow: "1.5px 1.5px 0 #000", color: "#fbbf24" }}>
            <AnimatedScore value={player.score} />
          </span>
          {isZombie && (
            <span 
              className="rarity-badge" 
              style={{ 
                backgroundColor: "var(--color-purple)", 
                color: "#fff", 
                fontSize: "0.6rem", 
                padding: "2px 6px", 
                marginLeft: "4px",
                border: "1.5px solid #000",
                boxShadow: "1px 1px 0 #000",
                textShadow: "1px 1px 0 #000",
                display: "inline-flex",
                alignItems: "center",
                gap: "2px"
              }}
            >
              x0.5 <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.4em", height: "1.4em", verticalAlign: "middle" }} /> (ZOMBIE)
            </span>
          )}
          {isHelpActive && (
            <div style={{ backgroundColor: "var(--color-cyan)", color: "#000", borderRadius: "50%", width: "12px", height: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: "bold" }}>?</div>
          )}
          {activeTooltip === "biscuits" && (
            <div onClick={() => setActiveTooltip(null)} style={{ position: "fixed", bottom: "90px", left: "16px", right: "16px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "12px", borderRadius: "12px", zIndex: 1000, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>
              Votre solde de Biscuits (Cookies). Augmente avec vos éliminations pour grimper au classement.
            </div>
          )}
        </div>

        {/* Relances 🌀 */}
        <div 
          onClick={() => triggerTooltip("skips")}
          style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", position: "relative" }}
        >
          <span style={{ fontSize: "1.4rem" }}>🌀</span>
          <span style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem", textShadow: "1.5px 1.5px 0 #000", color: "var(--color-cyan)" }}>
            {player.skips}
          </span>
          {isHelpActive && (
            <div style={{ backgroundColor: "var(--color-cyan)", color: "#000", borderRadius: "50%", width: "12px", height: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: "bold" }}>?</div>
          )}
          {activeTooltip === "skips" && (
            <div onClick={() => setActiveTooltip(null)} style={{ position: "fixed", bottom: "90px", left: "16px", right: "16px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "12px", borderRadius: "12px", zIndex: 1000, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(0,0,0,0.7)" }}>
              Votre solde de 🌀. Consommez-en un pour changer de défi sans changer de cible.
            </div>
          )}
        </div>
      </div>

      {/* --- ONGLET CONTRAT 🎯 --- */}
      {activeTab === "contrat" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          
          {/* Hub Le Campement des Assassins 2D */}
          <div 
            ref={campfireContainerRef}
            data-tuto="campement"
            style={{
              height: "180px",
              margin: "8px 10px",
              border: "3px solid #000",
              borderRadius: "16px",
              boxShadow: "4px 4px 0 #000",
              backgroundColor: "#0d0a1b",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {/* Arrière-plan psychédélique avec parallaxe */}
            <div style={{
              position: "absolute",
              width: "110%",
              height: "110%",
              backgroundImage: "radial-gradient(circle, #231249 0%, #0d0a1b 80%)",
              transform: `translate(${parallaxOffset.x * 0.5}px, ${parallaxOffset.y * 0.5}px)`,
              zIndex: 1
            }} />

            {/* Feu de camp animé au centre (interactif) */}
            <div 
              className="fire-camp"
              onClick={() => {
                setResetKey(prev => prev + 1);
                showToast("Positions réinitialisées ! 🔥");
              }}
              style={{
                zIndex: 2, // Low z-index so avatars slide over it!
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)"
              }}
            >
              <span style={{ fontSize: "3.2rem" }}>🔥</span>
            </div>

            {/* Zone de détection et de pulsation crépitement autour du feu */}
            <div 
              ref={fireRef}
              className="fire-pulse-ring"
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                border: "2px dashed rgba(249, 115, 22, 0.4)",
                zIndex: 1,
                pointerEvents: "none"
              }}
            />

            {/* Aide du Feu de Camp si active */}
            {isHelpActive && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  triggerTooltip("campfire");
                }}
                style={{ 
                  position: "absolute", 
                  top: "10px", 
                  right: "10px", 
                  backgroundColor: "var(--color-cyan)", 
                  color: "#000", 
                  borderRadius: "50%", 
                  width: "18px", 
                  height: "18px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  fontSize: "11px", 
                  fontWeight: "bold", 
                  cursor: "pointer",
                  zIndex: 20
                }}
              >
                ?
              </div>
            )}
            {activeTooltip === "campfire" && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTooltip(null);
                }} 
                style={{ 
                  position: "fixed", 
                  bottom: "90px", 
                  left: "16px", 
                  right: "16px", 
                  backgroundColor: "#1e1b30", 
                  border: "2px solid var(--color-cyan)", 
                  padding: "12px", 
                  borderRadius: "12px", 
                  zIndex: 10000, 
                  fontSize: "0.85rem", 
                  boxShadow: "0 4px 20px rgba(0,0,0,0.7)" 
                }}
              >
                <strong>Le Campement :</strong> Faites glisser la bulle d'un autre joueur suspecté dans le feu de camp central 🔥 pour lancer une accusation de meurtre. Attention, accuser à tort vous coûtera 0.5 ❤️. On ne peut pas accuser un joueur zombie 🧟 ou gelé ❄️.
              </div>
            )}

            {/* Cercle d'avatars des joueurs autour du feu */}
            <div style={{ position: "absolute", width: "100%", height: "100%", zIndex: 15 }}>
              {(() => {
                const sortedCampPlayers = [...gameState.players]
                  .filter(p => p.name.toUpperCase() !== player.name.toUpperCase())
                  .sort((a, b) => a.name.localeCompare(b.name));
                return sortedCampPlayers.map((p, idx) => {
                  const userPhoto = campPhotos[p.name];
                  const isSuspecting = gameState.history.some(
                    h => h.playerName === p.name && h.type === "counter_attack_pending" && h.status === "pending"
                  );
                  const isAccused = gameState.history.some(
                    h => h.targetName === p.name && h.type === "counter_attack_pending" && h.status === "pending"
                  );

                  let radarClass = "";
                  if (isSuspecting) radarClass = "radar-cyan";
                  else if (isAccused) radarClass = "radar-orange";

                  const isMe = p.name === player.name;

                  return (
                    <CampfireAvatar
                      key={p.name}
                      p={p}
                      idx={idx}
                      total={sortedCampPlayers.length}
                      isMe={isMe}
                      campPhoto={userPhoto}
                      radarClass={radarClass}
                      handleAvatarDragEnd={handleAvatarDragEnd}
                      getPlayerDisplayName={getPlayerDisplayName}
                      campfireContainerRef={campfireContainerRef}
                      resetKey={resetKey}
                    />
                  );
                });
              })()}
            </div>
          </div>

          {/* Section Contrat principal */}
          {/* Section Contrat principal / Mode Moisi */}
          {isZombie ? (
            /* AFFICHAGE DU MODE MOISI */
            <div style={{ display: "flex", flexDirection: "column", padding: "10px", alignItems: "center" }}>
              <h2 style={{ fontSize: "2rem", color: "var(--color-zombie)", fontFamily: "var(--font-title)", textTransform: "uppercase", margin: "10px 0 2px 0", textShadow: "3px 3px 0 #000" }}>
                MODE MOISI
              </h2>
              <div style={{ backgroundColor: "#1c3d27", color: "var(--color-zombie)", border: "2px solid var(--color-zombie)", padding: "4px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px", boxShadow: "2px 2px 0 #000" }}>
                CADAVRE AMBULANT
              </div>

              {/* Image de la pierre tombale et Coeur Brisé */}
              <div style={{ position: "relative", width: "120px", height: "120px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img 
                  src={tombstoneZombie} 
                  alt="Tombeau Zombie" 
                  style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))", zIndex: 1 }}
                />
                {!lowPerfMode && (
                  <div className="giant-broken-heart">💔</div>
                )}
              </div>

              <p style={{ fontSize: "0.85rem", color: "#9ca3af", textAlign: "center", fontStyle: "italic", padding: "0 15px", lineHeight: "1.4", marginBottom: "15px" }}>
                "Vous êtes officiellement en décomposition. Votre pseudo sent le vieux camembert oublié au soleil."
              </p>

              {/* Cadre Contrat de Morsure */}
              <div className="card-cartoon" style={{ border: "3px solid var(--color-zombie)", backgroundColor: "#0c1510", width: "100%", padding: "12px", textAlign: "left", marginBottom: "15px", boxShadow: "4px 4px 0 #000", position: "relative" }}>
                {pendingHit && (
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#0c1510",
                    borderRadius: "12px",
                    zIndex: 30,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <div style={{
                      backgroundColor: "var(--color-zombie)",
                      color: "#fff",
                      fontFamily: "var(--font-title)",
                      padding: "8px 16px",
                      border: "3px solid #000",
                      boxShadow: "3px 3px 0 #000",
                      textTransform: "uppercase",
                      fontSize: "0.8rem",
                      textAlign: "center",
                      transform: "rotate(-6deg)",
                      position: "relative",
                      zIndex: 100
                    }}>
                      MORSURE EN EXAMEN ⚖️
                    </div>
                  </div>
                )}
                
                <h3 style={{ fontSize: "0.8rem", color: "var(--color-zombie)", fontFamily: "var(--font-title)", textTransform: "uppercase", margin: "0 0 6px 0" }}>
                  🧟 Contrat de Morsure
                </h3>
                <h4 style={{ fontSize: "1.05rem", color: "#fff", margin: "4px 0" }}>
                  {currentAction ? currentAction.title : "Morsure Zombie"}
                </h4>
                <p style={{ fontSize: "0.85rem", color: "#9ca3af", fontStyle: "italic", margin: "4px 0 8px 0" }}>
                  {currentAction ? currentAction.description : "Faire prononcer le mot 'Cerveau' à un survivant ou lui faire mimer une marche de zombie."}
                </p>
                <div style={{ display: "flex", gap: "12px", fontSize: "0.8rem", fontWeight: "bold", borderTop: "1px solid rgba(34, 197, 94, 0.2)", paddingTop: "8px" }}>
                  <span style={{ color: "#fbbf24", display: "flex", alignItems: "center", gap: "4px" }}>Récompense : +50 <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.5em", height: "1.5em", verticalAlign: "middle" }} /></span>
                  <span style={{ color: "var(--color-green)" }}>Rédemption : +1.0 ❤️</span>
                </div>
              </div>

              {/* Sélection de la cible à mordre */}
              <div style={{ width: "100%", textAlign: "left", marginBottom: "15px" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--color-zombie)", fontWeight: "bold", marginBottom: "6px", display: "block" }}>
                  CIBLES POTENTIELLES :
                </label>
                <select
                  value={zombieVictim}
                  onChange={(e) => setZombieVictim(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "10px",
                    backgroundColor: "#161320",
                    color: "#fff",
                    border: "3px solid #000",
                    boxShadow: "3px 3px 0 #000"
                  }}
                  disabled={pendingHit}
                >
                  <option value="">-- Choisir un survivant à mordre --</option>
                  {gameState.players.filter(p => !p.isZombie && !p.isFrozen).map(p => (
                    <option key={p.name} value={p.name}>{getPlayerDisplayName(p.name)}</option>
                  ))}
                </select>
              </div>

              {/* Bouton de morsure */}
              <button
                type="button"
                className="btn-cartoon btn-red animate-pulse"
                style={{ width: "100%", height: "48px", backgroundColor: "#b91c1c", border: "3px solid #000" }}
                disabled={pendingHit || !zombieVictim}
                onClick={handleHitSubmit}
              >
                MORDRE UN SURVIVANT 🧟
              </button>
            </div>
          ) : player.target ? (
            /* ÉCRAN DE TRAQUE STANDARD SURVIVANT */
            <div style={{ position: "relative" }}>
              {/* Masque de dissimulation */}
              {isMasked ? (
                <div 
                  className="card-cartoon glow-purple"
                  onClick={() => setIsMasked(false)}
                  style={{
                    height: "190px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    backgroundColor: "#110e20"
                  }}
                >
                  <EyeOff size={48} style={{ color: "var(--color-purple)", marginBottom: "8px" }} />
                  <span style={{ fontFamily: "var(--font-title)", fontSize: "1rem" }}>
                    Chasse Dissimulée
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "4px" }}>
                    (Cliquez pour révéler vos secrets)
                  </span>
                </div>
              ) : (
                <div 
                  className={`card-cartoon ${rarityClass} glow-cyan`}
                  data-tuto="contrat"
                  style={{ minHeight: "190px", position: "relative", cursor: "pointer" }}
                  onClick={() => setIsMasked(true)}
                >
                  {isTargetFrozen && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      backgroundColor: "rgba(34, 211, 238, 0.15)",
                      border: "3.5px solid var(--color-cyan)",
                      borderRadius: "16px",
                      zIndex: 35,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none"
                    }}>
                      <span style={{ fontSize: "3rem", filter: "drop-shadow(0 0 10px rgba(0,255,255,0.8))" }}>❄️</span>
                      <span style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem", color: "#fff", textShadow: "2px 2px 0 #000", marginTop: "4px" }}>
                        CIBLE EXFILTRÉE
                      </span>
                    </div>
                  )}

                  {/* Scan holographique cyan */}
                  <div className="scan-line" />

                  {/* Bulle d'aide contextuelle */}
                  {isHelpActive && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerTooltip("target_card");
                      }}
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        backgroundColor: "var(--color-cyan)",
                        color: "#000",
                        borderRadius: "50%",
                        width: "18px",
                        height: "18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        zIndex: 40
                      }}
                    >
                      ?
                    </div>
                  )}
                  {activeTooltip === "target_card" && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTooltip(null);
                      }} 
                      style={{ 
                        position: "fixed", 
                        bottom: "90px", 
                        left: "16px", 
                        right: "16px", 
                        backgroundColor: "#1e1b30", 
                        border: "2px solid var(--color-cyan)", 
                        padding: "12px", 
                        borderRadius: "12px", 
                        zIndex: 10000, 
                        fontSize: "0.85rem", 
                        boxShadow: "0 4px 20px rgba(0,0,0,0.7)" 
                      }}
                    >
                      <strong>Votre Contrat Secret :</strong> Affiche le profil de votre cible active ainsi que le piège absurde à réaliser. Cliquez n'importe où sur cet encart pour le masquer instantanément en cas de danger !
                    </div>
                  )}

                  {/* Bandeau Examen si arbitrage en cours */}
                  {pendingHit && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      backgroundColor: "rgba(17, 14, 32, 0.95)",
                      borderRadius: "12px",
                      zIndex: 30,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <div style={{
                        backgroundColor: "var(--color-red)",
                        color: "#fff",
                        fontFamily: "var(--font-title)",
                        padding: "8px 16px",
                        border: "3px solid #000",
                        boxShadow: "3px 3px 0 #000",
                        textTransform: "uppercase",
                        fontSize: "0.8rem",
                        textAlign: "center",
                        transform: "rotate(-6deg)"
                      }}>
                        EN COURS D'EXAMEN PAR LE JUGE ⚖️
                      </div>
                    </div>
                  )}

                  {/* Contenu de la fiche contrat */}
                  <span className="rarity-badge" style={{ backgroundColor: `var(--rarity-${rarityLabel.toLowerCase()})` }}>
                    {rarityLabel}
                  </span>

                  <div style={{ marginTop: "10px", width: "100%" }}>
                    {/* Partie haute : Avatar + Nom Cible (Centrés) */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", marginBottom: "12px" }}>
                      <div style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        border: "2px solid #000",
                        backgroundColor: "#2e255c",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "2px 2px 0 #000",
                        flexShrink: 0,
                        position: "relative",
                        marginBottom: "8px"
                      }}>
                        {targetPhoto ? (
                          <img src={targetPhoto} alt="Cible" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: "1.8rem" }}>👤</span>
                        )}
                        {!lowPerfMode && (
                          <div 
                            className="target-crosshair"
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              border: "2px solid rgba(239, 68, 68, 0.4)",
                              borderRadius: "50%",
                              pointerEvents: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            <div style={{ position: "absolute", width: "100%", height: "1.5px", backgroundColor: "rgba(239, 68, 68, 0.6)" }} />
                            <div style={{ position: "absolute", width: "1.5px", height: "100%", backgroundColor: "rgba(239, 68, 68, 0.6)" }} />
                            <div style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "rgb(239, 68, 68)", zIndex: 2 }} />
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--color-cyan)", fontFamily: "var(--font-title)", textTransform: "uppercase" }}>
                          Cible Secrète :
                        </span>
                        <h2 style={{ fontSize: "1.6rem", margin: 0, color: "#fff", transform: "none", textShadow: "2px 2px 0 #000", lineHeight: "1.2" }}>
                          {getPlayerDisplayName(player.target)}
                        </h2>
                      </div>
                    </div>

                    {/* Partie basse : Défi + Gain (Alignés à gauche) */}
                    <div style={{ textAlign: "left" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--color-purple)", fontFamily: "var(--font-title)", textTransform: "uppercase", display: "block", marginTop: "8px" }}>
                        Piège Absurde :
                      </span>
                      <p style={{ fontSize: "0.95rem", color: "#e5e7eb", fontStyle: "italic", marginTop: "2px" }}>
                        {currentAction ? currentAction.description : "Pas de défi actif. Demandez une relance ou attendez."}
                      </p>

                      {currentAction && (
                        <div style={{ display: "flex", gap: "10px", marginTop: "12px", fontSize: "0.8rem", fontWeight: "bold" }}>
                          <span style={{ color: "#fbbf24", display: "flex", alignItems: "center", gap: "4px" }}> Récompense : +{isZombie ? Math.floor(currentAction.scoreReward / 2) : currentAction.scoreReward} <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.5em", height: "1.5em", verticalAlign: "middle" }} /></span>
                          <span style={{ color: "var(--color-red)" }}> Dégâts : -{isZombie ? 0 : currentAction.damagePenalty} ❤️</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Boutons d'Action Contrat */}
              {/* Ligne 1: Contrat Exécuté */}
              <div style={{ padding: "0 10px", marginTop: "12px" }}>
                <button
                  type="button"
                  className={`btn-cartoon ${isTargetFrozen ? "btn-disabled" : "btn-green"}`}
                  style={{ width: "100%", height: "48px" }}
                  disabled={pendingHit || isTargetFrozen}
                  onClick={handleHitSubmit}
                >
                  {isTargetFrozen ? "Cible Gelée ❄️" : "⚔️ Contrat Exécuté"}
                </button>
              </div>

              {/* Ligne 2: Abandonner Cible & Brûler mission */}
              <div style={{ display: "flex", gap: "12px", padding: "0 10px", marginTop: "12px" }}>
                <button
                  type="button"
                  className="btn-cartoon"
                  style={{
                    flex: 1,
                    fontSize: "0.85rem",
                    backgroundColor: pendingHit ? "#374151" : "#ffffff",
                    color: pendingHit ? "#9ca3af" : "#000000",
                    height: "40px"
                  }}
                  disabled={pendingHit}
                  onClick={() => setShowAbandonModal(true)}
                >
                  🏳️ Abandonner Cible
                </button>

                <button
                  type="button"
                  className="btn-cartoon btn-cyan"
                  style={{ flex: 1, height: "40px", fontSize: "0.85rem", padding: "0" }}
                  disabled={player.skips < 1 || pendingHit}
                  onClick={() => setShowSkipConfirmModal(true)}
                  title="Brûler la Recette"
                >
                  Brûler mission 🌀
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: "30px 15px", textAlign: "center", color: "#9ca3af" }}>
              {player.isFrozen ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "10px" }}>
                  <span style={{ fontSize: "2.5rem" }}>❄️</span>
                  <h3 style={{ color: "var(--color-cyan)", fontFamily: "var(--font-title)", fontSize: "1.2rem", margin: "0 0 4px 0", textShadow: "2px 2px 0 #000", transform: "none" }}>
                    EXFILTRATION DU CAMPEMENT
                  </h3>
                  <p style={{ fontSize: "0.85rem", lineHeight: "1.5", margin: 0, color: "#d1d5db", maxWidth: "300px", textAlign: "center" }}>
                    Tu es actuellement gelé et en sécurité au camp, hors de portée des tueurs et des morsures. 
                    <br /><br />
                    Plus d'action ni de cible de mission disponible car tu as quitté le festival avant le dernier jour.
                    <br /><br />
                    <span style={{ color: "var(--color-purple)", fontWeight: "bold" }}>Tu restes présent et comptabilisé pour le Classement final ! 🏆</span>
                  </p>
                </div>
              ) : (
                <p>Aucune cible active. En attente du début de la chasse par le GM... 🏕️</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- ONGLET SOURCE ⛲ (POINT D'EAU DOUTEUX) --- */}
      {activeTab === "source" && (
        <div className="card-cartoon glow-cyan" style={{ margin: "10px" }}>
          <h2 style={{ color: "var(--color-cyan)", textAlign: "center", width: "100%", marginBottom: "1rem" }}>
            Le Point d'Eau Douteux ⛲
          </h2>

          <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "1rem", lineHeight: "1.4" }}>
            Pour regagner des ❤️, vous devez accomplir un défi de la Source. 
            Les Zombies 🧟 n'ont pas accès à la Source.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", marginBottom: "1rem", fontSize: "0.8rem", alignItems: "center" }}>
            <div 
              onClick={() => triggerTooltip("fountain_uses")} 
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", backgroundColor: "rgba(0,0,0,0.3)", padding: "4px 8px", borderRadius: "8px", border: "1.5px solid var(--color-cyan)" }}
            >
              <span>Utilisations : <strong>{player.fountainUsesToday} / 2</strong></span>
              {isHelpActive && (
                <span style={{ backgroundColor: "var(--color-cyan)", color: "#000", borderRadius: "50%", width: "14px", height: "14px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "bold" }}>?</span>
              )}
            </div>
            <div 
              onClick={() => triggerTooltip("fountain_refreshes")} 
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", backgroundColor: "rgba(0,0,0,0.3)", padding: "4px 8px", borderRadius: "8px", border: "1.5px solid var(--color-cyan)" }}
            >
              <span>Relances : <strong>{player.fountainRefreshesToday} 🔄</strong></span>
              {isHelpActive && (
                <span style={{ backgroundColor: "var(--color-cyan)", color: "#000", borderRadius: "50%", width: "14px", height: "14px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "bold" }}>?</span>
              )}
            </div>

            {activeTooltip === "fountain_uses" && (
              <div onClick={() => setActiveTooltip(null)} style={{ position: "fixed", bottom: "90px", left: "16px", right: "16px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "12px", borderRadius: "12px", zIndex: 1000, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(0,0,0,0.7)", textAlign: "left" }}>
                Vos réserves d'eau quotidiennes. Votre compteur est réinitialisé chaque matin par le Chant du Coq.
              </div>
            )}

            {activeTooltip === "fountain_refreshes" && (
              <div onClick={() => setActiveTooltip(null)} style={{ position: "fixed", bottom: "90px", left: "16px", right: "16px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "12px", borderRadius: "12px", zIndex: 1000, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(0,0,0,0.7)", textAlign: "left" }}>
                Le nombre de relances de la Source restantes aujourd'hui. Chaque relance remplace le couple d'Action et de Vérité proposé.
              </div>
            )}
          </div>

          {player.fountainUsesToday >= 2 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--color-red)", border: "2px dashed var(--color-red)", borderRadius: "12px" }}>
              La Source est à sec pour toi aujourd'hui. Va faire la sieste ou attends que le Coq chante. 🐓
            </div>
          ) : isZombie ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--color-zombie)", border: "2px dashed var(--color-zombie)", borderRadius: "12px" }}>
              Tu es un zombie. Les cœurs de zombie ne peuvent pas être soignés par la Source. Va mordre quelqu'un ! 🧠
            </div>
          ) : player.lives >= 7.0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--color-green)", border: "2px dashed var(--color-green)", borderRadius: "12px", lineHeight: "1.4" }}>
              Tu débordes de vie. Calme-toi, l'ami, et va plutôt courir dans la boue au lieu de vider la gourde des copains. ⛲
            </div>
          ) : (
            <div>
              {fountainChoice ? (
                <>
                  <div style={{ border: "2px solid var(--color-cyan)", borderRadius: "12px", padding: "12px", backgroundColor: "rgba(34, 211, 238, 0.03)" }}>
                  <h3 style={{ fontSize: "1.1rem", margin: "4px 0", transform: "none", textShadow: "none", color: "#fff", lineHeight: "1.4" }}>
                    <span style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--color-cyan)", fontWeight: "bold" }}>
                      Défi de la Source :{" "}
                    </span>
                    {fountainChoice.title ? fountainChoice.title : (fountainType === "action" ? "ACTION" : "VERITE")}
                  </h3>
                  <p style={{ fontSize: "0.9rem", fontStyle: "italic", margin: "8px 0 4px 0" }}>
                    {fountainChoice.desc}
                  </p>

                  {/* Formulaire de Preuve */}
                  <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                    {fountainType === "verite" ? (
                      <div>
                        <label style={{ fontSize: "0.8rem", color: "var(--color-cyan)", display: "block", marginBottom: "4px" }}>
                          Votre Confession (Vérité) :
                        </label>
                        <textarea
                          value={fountainTextProof}
                          onChange={(e) => setFountainTextProof(e.target.value)}
                          placeholder="Tapez votre aveu sincère ici..."
                          style={{
                            width: "100%",
                            height: "60px",
                            backgroundColor: "#1a172e",
                            border: "2px solid #000",
                            borderRadius: "8px",
                            padding: "8px",
                            color: "#fff"
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontSize: "0.8rem", color: "var(--color-cyan)", display: "block", marginBottom: "4px" }}>
                          Preuve Photo (Action) :
                        </label>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <input
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = () => setFountainPhotoProof(reader.result);
                              reader.readAsDataURL(file);
                            }}
                            style={{ display: "none" }}
                            id="fountain-cam"
                          />
                          <label htmlFor="fountain-cam" className="btn-cartoon btn-cyan" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", cursor: "pointer" }}>
                            <Camera size={16} /> Ouvrir Appareil Photo
                          </label>
                            {fountainPhotoProof && (
                              <div style={{ position: "relative", width: "48px", height: "48px", border: "2px solid #000", borderRadius: "6px", overflow: "hidden", boxShadow: "1px 1px 0 #000" }}>
                                <img src={fountainPhotoProof} alt="Preuve" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                <span style={{ position: "absolute", bottom: "1px", right: "1px", fontSize: "0.8rem", textShadow: "1px 1px 0 #000" }}>✅</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                        <button
                          type="button"
                          className="btn-cartoon btn-green"
                          style={{ flex: 1, padding: "0.5rem" }}
                          onClick={handleFountainSubmit}
                        >
                          Valider Soin
                        </button>
                        <button
                          type="button"
                          className="btn-cartoon"
                          style={{ flex: 1, padding: "0.5rem", backgroundColor: "#4b5563" }}
                          onClick={() => setFountainChoice(null)}
                        >
                          Retour
                        </button>
                      </div>
                    </div>
                  </div>
                  {player.fountainRefreshesToday > 0 && (
                    <button
                      type="button"
                      className="btn-cartoon"
                      style={{ width: "100%", padding: "0.5rem", marginTop: "12px", backgroundColor: "var(--color-purple)", border: "2px solid #000" }}
                      onClick={handleFountainRefresh}
                    >
                      Rafraîchir 🔄
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative" }}>
                  {isHelpActive && (
                    <div 
                      onClick={() => triggerTooltip("fountain_draw")} 
                      style={{ 
                        position: "absolute", 
                        top: "4px", 
                        right: "4px", 
                        backgroundColor: "var(--color-cyan)", 
                        color: "#000", 
                        borderRadius: "50%", 
                        width: "16px", 
                        height: "16px", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        fontSize: "10px", 
                        fontWeight: "bold", 
                        cursor: "pointer", 
                        zIndex: 10 
                      }}
                    >
                      ?
                    </div>
                  )}

                  {activeTooltip === "fountain_draw" && (
                    <div onClick={() => setActiveTooltip(null)} style={{ position: "fixed", bottom: "90px", left: "16px", right: "16px", backgroundColor: "#1e1b30", border: "2px solid var(--color-cyan)", padding: "12px", borderRadius: "12px", zIndex: 1000, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(0,0,0,0.7)", textAlign: "left" }}>
                      Choisis ton poison. L'Action requiert une preuve photo (appareil photo requis), la Vérité une confession écrite. Pas de mensonge devant la Source.
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", gap: "20px", marginTop: "15px", marginBottom: "15px" }}>
                    {/* Left card: Puiser Action */}
                    <button
                      type="button"
                      className="card-cartoon glow-cyan"
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "16px 8px",
                        cursor: "pointer",
                        backgroundColor: "#161b2e",
                        border: "3px solid #000",
                        height: "120px",
                        margin: 0
                      }}
                      onClick={() => handleFountainDraw("action")}
                    >
                      <span style={{ fontSize: "2rem", marginBottom: "4px" }}>⚡</span>
                      <span style={{ fontFamily: "var(--font-title)", fontSize: "0.85rem", color: "#fff" }}>Action</span>
                    </button>

                    {/* Center: VS text */}
                    <div style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%) rotate(-12deg)",
                      backgroundColor: "var(--color-cyan)",
                      color: "#000",
                      fontFamily: "var(--font-title)",
                      fontSize: "1.6rem",
                      padding: "4px 10px",
                      border: "3px solid #000",
                      boxShadow: "2px 2px 0 #000",
                      zIndex: 10,
                      borderRadius: "6px",
                      pointerEvents: "none"
                    }}>
                      VS
                    </div>

                    {/* Right card: Puiser Vérité */}
                    <button
                      type="button"
                      className="card-cartoon glow-green"
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "16px 8px",
                        cursor: "pointer",
                        backgroundColor: "#161b2e",
                        border: "3px solid #000",
                        height: "120px",
                        margin: 0
                      }}
                      onClick={() => handleFountainDraw("verite")}
                    >
                      <span style={{ fontSize: "2rem", marginBottom: "4px" }}>💬</span>
                      <span style={{ fontFamily: "var(--font-title)", fontSize: "0.85rem", color: "#fff" }}>Vérité</span>
                    </button>
                  </div>
                  <div style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    marginTop: "16px",
                    fontFamily: "var(--font-title)",
                    fontSize: "1.5rem",
                    color: "var(--color-cyan)",
                    textShadow: "2px 2px 0 #000"
                  }}>
                    +{player.fountainTotalUses >= 5 ? "3.0" : player.fountainTotalUses >= 3 ? "1.5" : "0.5"} ❤️
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- ONGLET BOÎTE A IDÉES 💡 (USINE A SÉVICES) --- */}
      {activeTab === "suggestion" && (
        <div className="card-cartoon glow-purple" style={{ margin: "10px", position: "relative" }}>
          <h2 style={{ color: "var(--color-purple)", textAlign: "center", width: "100%", marginBottom: "1rem" }}>
            L'Usine à Sévices 💡
          </h2>

          <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "1.2rem", lineHeight: "1.4" }}>
            Suggérez vos propres idées de défis secrets au Grand Juge. S'il les valide, elles rejoindront le catalogue de jeu.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
            {/* Sélecteur de type */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
              <button
                type="button"
                style={{ flex: 1, padding: "6px", fontSize: "0.7rem", border: "2px solid #000", borderRadius: "8px", backgroundColor: suggestType === "mission" ? "var(--color-purple)" : "#100e1f", color: "#fff", fontWeight: "bold", cursor: "pointer" }}
                onClick={() => { setSuggestType("mission"); setSuggestReward(100); setSuggestDamage(1.5); }}
              >
                Mission 🎯
              </button>
              <button
                type="button"
                style={{ flex: 1, padding: "6px", fontSize: "0.7rem", border: "2px solid #000", borderRadius: "8px", backgroundColor: suggestType === "fountain_action" ? "var(--color-purple)" : "#100e1f", color: "#fff", fontWeight: "bold", cursor: "pointer" }}
                onClick={() => { setSuggestType("fountain_action"); setSuggestReward(0); setSuggestDamage(0.5); }}
              >
                Action ⚡
              </button>
              <button
                type="button"
                style={{ flex: 1, padding: "6px", fontSize: "0.7rem", border: "2px solid #000", borderRadius: "8px", backgroundColor: suggestType === "fountain_truth" ? "var(--color-purple)" : "#100e1f", color: "#fff", fontWeight: "bold", cursor: "pointer" }}
                onClick={() => { setSuggestType("fountain_truth"); setSuggestReward(0); setSuggestDamage(0.5); }}
              >
                Vérité 💬
              </button>
            </div>

            {suggestType === "mission" && (
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--color-purple)" }}>
                  Intitulé du défi :
                </label>
                <input
                  type="text"
                  value={suggestTitle}
                  onChange={(e) => setSuggestTitle(e.target.value)}
                  placeholder="Ex: Le Choc Shifumi ⚡"
                  style={{
                    width: "100%",
                    padding: "8px",
                    backgroundColor: "#1a172e",
                    border: "2px solid #000",
                    borderRadius: "8px",
                    color: "#fff",
                    marginTop: "2px"
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--color-purple)" }}>
                {suggestType === "fountain_truth" ? "Votre question à poser :" : "Description du défi / action à réaliser :"}
              </label>
              <textarea
                value={suggestDesc}
                onChange={(e) => setSuggestDesc(e.target.value)}
                placeholder={suggestType === "fountain_truth" ? "Votre question sincère..." : "Expliquez clairement ce qu'il faut faire..."}
                style={{
                  width: "100%",
                  height: "70px",
                  backgroundColor: "#1a172e",
                  border: "2px solid #000",
                  borderRadius: "8px",
                  padding: "8px",
                  color: "#fff",
                  marginTop: "2px"
                }}
              />
            </div>

            {suggestType === "mission" ? (
              /* Sélecteurs Récompense 🪙 et Dégâts ❤️ alignés */
              <div style={{ display: "flex", gap: "16px", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.5rem", height: "1.5rem", display: "inline-block", verticalAlign: "middle" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button type="button" className="btn-cartoon" style={{ padding: "4px 8px", fontSize: "0.8rem" }} onClick={() => setSuggestReward(Math.max(50, suggestReward - 50))}><Minus size={12}/></button>
                    <span style={{ fontFamily: "var(--font-title)", minWidth: "35px", textAlign: "center" }}>{suggestReward}</span>
                    <button type="button" className="btn-cartoon" style={{ padding: "4px 8px", fontSize: "0.8rem" }} onClick={() => setSuggestReward(Math.min(600, suggestReward + 50))}><Plus size={12}/></button>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.1rem" }}>❤️</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button type="button" className="btn-cartoon" style={{ padding: "4px 8px", fontSize: "0.8rem" }} onClick={() => setSuggestDamage(Math.max(0.5, suggestDamage - 0.5))}><Minus size={12}/></button>
                    <span style={{ fontFamily: "var(--font-title)", minWidth: "35px", textAlign: "center" }}>{suggestDamage}</span>
                    <button type="button" className="btn-cartoon" style={{ padding: "4px 8px", fontSize: "0.8rem" }} onClick={() => setSuggestDamage(Math.min(4.0, suggestDamage + 0.5))}><Plus size={12}/></button>
                  </div>
                </div>
              </div>
            ) : (
              /* Soin Fontaine pour action/verité : Sélection 3 étoiles */
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--color-cyan)", fontWeight: "bold" }}>
                  <span>Difficulté / Soin :</span>
                  <span>
                    {suggestDamage === 0.5 ? "Jus de Chaussette (+0.5 ❤️)" : 
                     suggestDamage === 1.5 ? "Élixir du Barman (+1.5 ❤️)" : 
                     "Larmes de VIP (+3.0 ❤️)"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    className="btn-cartoon"
                    style={{ padding: "4px 10px", fontSize: "0.8rem", backgroundColor: "var(--color-purple)", color: "#fff", border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}
                    onClick={() => {
                      if (suggestDamage === 3.0) setSuggestDamage(1.5);
                      else if (suggestDamage === 1.5) setSuggestDamage(0.5);
                    }}
                    disabled={suggestDamage === 0.5}
                  >
                    -
                  </button>
                  <div style={{ display: "flex", gap: "4px", margin: "0 8px" }}>
                    <span style={{ color: "#f59e0b", fontSize: "1.4rem", textShadow: "1px 1px 0 #000" }}>★</span>
                    <span style={{ color: suggestDamage >= 1.5 ? "#f59e0b" : "#4b5563", fontSize: "1.4rem", textShadow: "1px 1px 0 #000" }}>★</span>
                    <span style={{ color: suggestDamage >= 3.0 ? "#f59e0b" : "#4b5563", fontSize: "1.4rem", textShadow: "1px 1px 0 #000" }}>★</span>
                  </div>
                  <button
                    type="button"
                    className="btn-cartoon"
                    style={{ padding: "4px 10px", fontSize: "0.8rem", backgroundColor: "var(--color-purple)", color: "#fff", border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}
                    onClick={() => {
                      if (suggestDamage === 0.5) setSuggestDamage(1.5);
                      else if (suggestDamage === 1.5) setSuggestDamage(3.0);
                    }}
                    disabled={suggestDamage === 3.0}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn-cartoon btn-green"
              style={{ marginTop: "1rem", height: "44px" }}
              onClick={handleSuggestSubmit}
            >
              Envoyer à l'Arbitrage
            </button>

            {/* Suggestions déjà soumises et actives du joueur */}
            <div style={{ marginTop: "1.2rem" }}>
              <h4 style={{ fontFamily: "var(--font-title)", fontSize: "0.8rem", color: "var(--color-purple)", borderBottom: "2px solid var(--border-color)", paddingBottom: "4px", marginBottom: "8px" }}>
                Mes Suggestions actives
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "150px", overflowY: "auto" }}>
                {gameState.actionPool.filter(a => a.createdByPlayer === player.name).map(a => {
                  const displayTitle = a.type === "fountain_action" ? "Action" : (a.type === "fountain_truth" ? "Vérité" : a.title);
                  let typeLabel = "🎯 Mission";
                  let typeColor = "var(--color-purple)";
                  if (a.type === "fountain_action") {
                    typeLabel = "⚡ Action";
                    typeColor = "var(--color-cyan)";
                  } else if (a.type === "fountain_truth") {
                    typeLabel = "💬 Vérité";
                    typeColor = "#10b981";
                  }
                  return (
                    <div key={a.id} style={{ padding: "8px 10px", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: "8px", border: "1px solid rgba(168, 85, 247, 0.2)", fontSize: "0.75rem", textAlign: "left" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <div style={{ fontWeight: "bold", color: "#fff" }}>{displayTitle}</div>
                        <span style={{ fontSize: "0.6rem", padding: "1px 4px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.05)", border: `1px solid ${typeColor}`, color: typeColor, fontWeight: "bold" }}>
                          {typeLabel}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "2px" }}>{a.description}</div>
                      <div style={{ display: "flex", gap: "10px", marginTop: "4px", fontSize: "0.65rem" }}>
                        {(a.type === "mission" || !a.type) ? (
                          <>
                            <span style={{ color: "#fbbf24", display: "flex", alignItems: "center", gap: "2px" }}><img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.4em", height: "1.4em", verticalAlign: "middle" }} /> +{a.scoreReward}</span>
                            <span style={{ color: "var(--color-red)" }}>❤️ -{a.damagePenalty}</span>
                          </>
                        ) : (
                          <span style={{ color: "var(--color-green)", fontWeight: "bold" }}>❤️ +{a.damagePenalty}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {gameState.actionPool.filter(a => a.createdByPlayer === player.name).length === 0 && (
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontStyle: "italic", textAlign: "center", padding: "10px" }}>
                    Aucune suggestion active pour le moment. Proposez une idée !
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ONGLET CLASSEMENT 🏆 --- */}
      {activeTab === "classement" && (
        <Leaderboard 
          players={gameState.players} 
          history={gameState.history} 
          isHelpActive={isHelpActive}
          activeTooltip={activeTooltip}
          triggerTooltip={triggerTooltip}
          setActiveTooltip={setActiveTooltip}
        />
      )}

      {/* Mascotte interactive Cookie Assassin */}
      <AnimatePresence>
        {showMascotte && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            style={{
              position: "fixed",
              bottom: "75px",
              right: "15px",
              zIndex: 1000,
              display: "flex",
              alignItems: "flex-end",
              pointerEvents: "none"
            }}
          >
            <div style={{
              backgroundColor: "#161320",
              border: "3px solid #000",
              borderRadius: "12px",
              padding: "8px 12px",
              boxShadow: "3px 3px 0 #000",
              maxWidth: "200px",
              fontSize: "0.8rem",
              lineHeight: "1.3",
              color: "#fff",
              position: "relative",
              marginRight: "10px",
              pointerEvents: "auto"
            }}>
              {mascotteQuote}
              <div style={{
                position: "absolute",
                bottom: "10px",
                right: "-8px",
                width: "0",
                height: "0",
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
                borderLeft: "8px solid #000"
              }} />
            </div>
            <div style={{ fontSize: "3rem", pointerEvents: "auto", cursor: "pointer" }} onClick={() => setShowMascotte(false)}>
              🍪
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE : MON MATRICULE (PROFIL) */}
      <AnimatePresence>
        {showProfileModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}>
            <div className="card-cartoon glow-purple" style={{ width: "100%", maxWidth: "340px", textAlign: "center", maxHeight: "90vh", overflowY: "auto" }}>
              <button 
                type="button" 
                onClick={() => setShowProfileModal(false)}
                style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", color: "#fff", cursor: "pointer" }}
              >
                <X size={20}/>
              </button>

              <h2 style={{ color: "var(--color-purple)", marginBottom: "1rem" }}>Mon Matricule</h2>
              
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    border: "3px solid #000",
                    backgroundColor: "#2e255c",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : player.hasPhoto ? (
                      <span style={{ fontSize: "2rem" }}>👤</span>
                    ) : (
                      <span style={{ fontFamily: "var(--font-title)", fontSize: "1.5rem" }}>
                         {(player.displayName || player.name).slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handlePhotoUpload}
                    style={{ display: "none" }}
                    id="profile-cam"
                  />
                  <label 
                    htmlFor="profile-cam" 
                    style={{
                      position: "absolute",
                      bottom: "-4px",
                      right: "-4px",
                      backgroundColor: "var(--color-cyan)",
                      border: "2px solid #000",
                      borderRadius: "50%",
                      width: "28px",
                      height: "28px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer"
                    }}
                  >
                    <Camera size={14} color="#000" />
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{getPlayerDisplayName(player.name)}</span>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "0.8rem", color: "#9ca3af", marginTop: "4px" }}>
                  <span>PIN Secret : {revealPin ? (localStorage.getItem("cookillers_player_pin") || "****") : "****"}</span>
                  <button
                    type="button"
                    onClick={() => setRevealPin(!revealPin)}
                    style={{ background: "none", border: "none", color: "var(--color-cyan)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                    title="Révéler le PIN"
                  >
                    {revealPin ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Rang cosmétique & Barre de progression */}
              {(() => {
                const score = player.score;
                let nextScore = 150;
                let prevScore = 0;
                let rankLabel = "Le Touriste en Tongs";
                let rankIcon = "⚔️";

                if (score >= 3500) {
                  rankLabel = "Dieu du Pogo";
                  rankIcon = "👑";
                  nextScore = 3500;
                  prevScore = 3500;
                } else if (score >= 2000) {
                  rankLabel = "Légende du Camping";
                  rankIcon = "💀";
                  nextScore = 3500;
                  prevScore = 2000;
                } else if (score >= 1000) {
                  rankLabel = "L'Ombre Invisible";
                  rankIcon = "👻";
                  nextScore = 2000;
                  prevScore = 1000;
                } else if (score >= 450) {
                  rankLabel = "Le Chasseur de Bières";
                  rankIcon = "🐺";
                  nextScore = 1000;
                  prevScore = 450;
                } else if (score >= 150) {
                  rankLabel = "Le Tireur de Gobelet";
                  rankIcon = "🏹";
                  nextScore = 450;
                  prevScore = 150;
                }

                const percent = score >= 3500 ? 100 : Math.min(100, Math.max(0, ((score - prevScore) / (nextScore - prevScore)) * 100));

                return (
                  <div style={{ marginBottom: "1rem", padding: "8px", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: "10px", border: "2px solid var(--border-color)", textAlign: "left" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "4px" }}>
                      <span style={{ color: "var(--color-cyan)" }}>Rang : {rankIcon} {rankLabel}</span>
                      {score < 3500 && <span style={{ fontSize: "0.7rem", color: "#9ca3af", display: "inline-flex", alignItems: "center", gap: "2px" }}>{score} / {nextScore} <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.4em", height: "1.4em", verticalAlign: "middle" }} /></span>}
                    </div>
                    {score < 3500 ? (
                      <div style={{ width: "100%", height: "8px", backgroundColor: "#110f1e", border: "1.5px solid #000", borderRadius: "6px", overflow: "hidden", boxShadow: "1px 1px 0 #000" }}>
                        <div style={{ width: `${percent}%`, height: "100%", backgroundColor: "var(--color-purple)", transition: "width 0.4s ease-in-out" }} />
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--color-purple)", fontWeight: "bold" }}>RANG MAXIMUM ATTEINT 🌟</span>
                    )}
                  </div>
                );
              })()}

              {/* Option performance réduite */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.3)",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "2px solid var(--border-color)",
                marginBottom: "1rem"
              }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Performances Réduites</span>
                <input
                  type="checkbox"
                  checked={lowPerfMode}
                  onChange={(e) => setLowPerfMode(e.target.checked)}
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
              </div>

              {/* Journal personnel des victimes neutralisées */}
              <div style={{ textAlign: "left", marginTop: "1rem" }}>
                <h4 style={{ fontFamily: "var(--font-title)", fontSize: "0.9rem", color: "var(--color-purple)", borderBottom: "2px solid var(--border-color)", paddingBottom: "4px" }}>
                  Tableau de chasse ({player.statKillsCount} neutralisés)
                </h4>
                <div style={{ maxHeight: "120px", overflowY: "auto", marginTop: "8px", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {gameState.history
                    .filter(h => h.playerName === player.name && h.type === "hit_approved" && h.status === "completed")
                    .map(h => (
                      <div key={h.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "4px" }}>
                        <span>⚔️ {h.targetName}</span>
                        <span style={{ color: "#fbbf24", display: "inline-flex", alignItems: "center", gap: "2px" }}>+{h.scoreReward} <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.4em", height: "1.4em", verticalAlign: "middle" }} /></span>
                      </div>
                    ))
                  }
                  {player.statKillsCount === 0 && (
                    <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Aucune victime pour l'instant. Les couteaux sont neufs.</span>
                  )}
                </div>
              </div>

              {/* Journal de mission personnel */}
              <div style={{ textAlign: "left", marginTop: "1.2rem" }}>
                <h4 style={{ fontFamily: "var(--font-title)", fontSize: "0.9rem", color: "var(--color-cyan)", borderBottom: "2px solid var(--border-color)", paddingBottom: "4px" }}>
                  Journal de Mission 📖
                </h4>
                <div style={{ maxHeight: "120px", overflowY: "auto", marginTop: "8px", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {gameState.history
                    .filter(h => h.playerName === player.name)
                    .map(h => {
                      let text = "";
                      let icon = "ℹ️";
                      const timeStr = new Date(h.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      
                      if (h.type === "hit_declared") {
                        text = `Infiltration en cours (Hit envoyé sur ${h.targetName}) ⏳`;
                        icon = "🎯";
                      } else if (h.type === "hit_approved") {
                        text = `Contrat validé (Cible ${h.targetName} neutralisée) ⚔️`;
                        icon = "⚔️";
                      } else if (h.type === "hit_rejected") {
                        text = `Contrat sur ${h.targetName} rejeté par le Juge ❌`;
                        icon = "❌";
                      } else if (h.type === "counter_attack_pending") {
                        text = `Dénonciation envoyée au Bureau des Rumeurs ⚠️`;
                        icon = "⚠️";
                      } else if (h.type === "counter_attack_correct") {
                        text = `Dénonciation confirmée correcte (Tueur repoussé) 🛡️`;
                        icon = "🛡️";
                      } else if (h.type === "counter_attack_incorrect") {
                        text = `Fausse accusation de meurtre (-0.5 ❤️) ⚠️`;
                        icon = "⚠️";
                      } else if (h.type === "skip_mission") {
                        text = `Recette brûlée 🌀`;
                        icon = "🌀";
                      } else if (h.type === "fountain_use") {
                        text = `Abreuvé à la Source (Soin) ⛲`;
                        icon = "⛲";
                      } else if (h.type === "zombie_bite") {
                        text = `Morsure de rédemption sur ${h.targetName} 🧟`;
                        icon = "🧟";
                      } else if (h.type === "abandon_target") {
                        text = `Contrat abandonné 🏳️`;
                        icon = "🏳️";
                      }

                      if (!text) return null;

                      return (
                        <div key={h.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "4px" }}>
                          <span>{icon} {text}</span>
                          <span style={{ color: "#9ca3af", fontSize: "0.65rem" }}>{timeStr}</span>
                        </div>
                      );
                    })
                  }
                  {gameState.history.filter(h => h.playerName === player.name).length === 0 && (
                    <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Journal vide. Aucune action enregistrée pour le moment.</span>
                  )}
                </div>
              </div>
          </div>
        </div>
        )}
      </AnimatePresence>

      {/* MODALE : CONTRE-ATTAQUE (ACCUSATION) */}
      <AnimatePresence>
        {showCounterModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}>
            <div className="card-cartoon glow-red" style={{ width: "100%", maxWidth: "340px" }}>
              <button 
                type="button" 
                onClick={() => setShowCounterModal(false)}
                style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", color: "#fff", cursor: "pointer" }}
              >
                <X size={20}/>
              </button>

              <h2 style={{ color: "var(--color-red)", marginBottom: "1rem" }}>Bureau des Rumeurs</h2>
              <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginBottom: "1rem", lineHeight: "1.4" }}>
                Vous pensez être suivi ? Accusez directement un suspect et le défi qu'il essaie de vous faire commettre. 
                Fausse accusation : <strong>-0.5 ❤️</strong> !
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
                <div style={{ backgroundColor: "#151124", padding: "10px", borderRadius: "8px", border: "2px solid #000", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Suspect accusé :</span>
                  <div style={{ fontSize: "1.15rem", fontWeight: "bold", color: "var(--color-red)", marginTop: "2px" }}>
                    {getPlayerDisplayName(counterSuspect)}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem" }}>Quel défi secret tente-t-il de vous imposer ?</label>
                  <input
                    type="text"
                    value={counterAction}
                    onChange={(e) => setCounterAction(e.target.value)}
                    placeholder="Ex: Shifumi, Bachata, Hamac..."
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "8px",
                      backgroundColor: "#1a172e",
                      color: "#fff",
                      border: "2px solid #000",
                      marginTop: "2px"
                    }}
                  />
                </div>

                <button
                  type="button"
                  className="btn-cartoon btn-red"
                  style={{ marginTop: "1rem", height: "44px" }}
                  onClick={handleCounterAttack}
                >
                  Lancer la Dénonciation
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE : ABANDON DE CIBLE */}
      <AnimatePresence>
        {showAbandonModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}>
            <div className="card-cartoon glow-red" style={{ width: "100%", maxWidth: "340px", textAlign: "center" }}>
              <h3 style={{ color: "var(--color-red)", marginBottom: "1rem" }}>Abandonner le contrat</h3>
              <p style={{ fontSize: "0.85rem", color: "#d1d5db", marginBottom: "1.2rem", lineHeight: "1.4" }}>
                Votre cible a fui le festival ? Abandonner le contrat entraîne une pénalité immédiate. 
                Choisissez votre sacrifice :
              </p>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", gap: "20px", marginTop: "15px", marginBottom: "15px" }}>
                {/* Left option: Heart */}
                <button
                  type="button"
                  className={`card-cartoon ${player.lives <= 0.5 ? "btn-disabled" : "glow-red"}`}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "16px 8px",
                    cursor: player.lives <= 0.5 ? "not-allowed" : "pointer",
                    backgroundColor: "#221a36",
                    border: "3px solid #000",
                    opacity: player.lives <= 0.5 ? 0.5 : 1,
                    minWidth: "120px",
                    height: "120px",
                    margin: 0
                  }}
                  disabled={player.lives <= 0.5}
                  onClick={() => {
                    abandonTarget("life");
                    setShowAbandonModal(false);
                    showToast("Cible abandonnée. Nouveau contrat pioché ! 💔");
                  }}
                >
                  <span style={{ fontSize: "2rem", marginBottom: "4px" }}>❤️</span>
                  <span style={{ fontFamily: "var(--font-title)", fontSize: "0.9rem", color: "#fff" }}>-0.5 ❤️</span>
                  <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)" }}>Sacrifice</span>
                </button>

                {/* Center: VS text */}
                <div style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%) rotate(-12deg)",
                  backgroundColor: "var(--color-red)",
                  color: "#fff",
                  fontFamily: "var(--font-title)",
                  fontSize: "1.6rem",
                  padding: "4px 10px",
                  border: "3px solid #000",
                  boxShadow: "2px 2px 0 #000",
                  zIndex: 10,
                  borderRadius: "6px",
                  pointerEvents: "none"
                }}>
                  VS
                </div>

                {/* Right option: Biscuits */}
                <button
                  type="button"
                  className={`card-cartoon ${player.score < 50 ? "btn-disabled" : "glow-yellow"}`}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "16px 8px",
                    cursor: player.score < 50 ? "not-allowed" : "pointer",
                    backgroundColor: "#221a36",
                    border: "3px solid #000",
                    opacity: player.score < 50 ? 0.5 : 1,
                    minWidth: "120px",
                    height: "120px",
                    margin: 0
                  }}
                  disabled={player.score < 50}
                  onClick={() => {
                    abandonTarget("score");
                    setShowAbandonModal(false);
                    showToast("Cible abandonnée. Nouveau contrat pioché ! 🪙");
                  }}
                >
                  <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "2.4rem", height: "2.4rem", marginBottom: "4px" }} />
                  <span style={{ fontFamily: "var(--font-title)", fontSize: "0.9rem", color: "#fff", display: "inline-flex", alignItems: "center", gap: "2px" }}>-50 <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.4em", height: "1.4em", verticalAlign: "middle" }} /></span>
                  <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)" }}>Biscuits</span>
                </button>
              </div>

              {player.lives <= 0.5 && (
                <p style={{ fontSize: "0.75rem", color: "var(--color-red)", marginTop: "10px" }}>
                  ⚠️ Santé trop basse pour payer en cœurs (minimum 0.5 restant obligatoire).
                </p>
              )}

              <button
                type="button"
                className="btn-cartoon"
                style={{ width: "100%", marginTop: "1.2rem", backgroundColor: "#4b5563" }}
                onClick={() => setShowAbandonModal(false)}
              >
                Retour
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE : CONFIRMATION DE SKIP */}
      <AnimatePresence>
        {showSkipConfirmModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}>
            <div className="card-cartoon glow-purple" style={{ width: "100%", maxWidth: "340px", textAlign: "center" }}>
              <h3 style={{ color: "var(--color-purple)", marginBottom: "1rem" }}>Brûler la Recette ?</h3>
              <p style={{ fontSize: "0.85rem", color: "#d1d5db", marginBottom: "1.2rem", lineHeight: "1.4" }}>
                Voulez-vous vraiment changer de défi ? Cette action consommera <strong>1 jeton de relance 🌀</strong>.
                <br />
                <span style={{ color: "var(--color-cyan)" }}>Solde restant : {player.skips} 🌀</span>
              </p>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-cartoon btn-cyan"
                  style={{ flex: 1, height: "44px" }}
                  onClick={() => {
                    skipMission();
                    setShowSkipConfirmModal(false);
                  }}
                >
                  Confirmer
                </button>
                <button
                  type="button"
                  className="btn-cartoon"
                  style={{ flex: 1, height: "44px", backgroundColor: "#4b5563" }}
                  onClick={() => setShowSkipConfirmModal(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE : ACCÈS INTERDIT AUX ZOMBIES */}
      <AnimatePresence>
        {showZombieFountainModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}>
            <div className="card-cartoon glow-red" style={{ width: "100%", maxWidth: "340px", textAlign: "center" }}>
              <span style={{ fontSize: "3rem" }}>🧟🔒</span>
              <h3 style={{ color: "var(--color-red)", margin: "1rem 0" }}>Accès Interdit !</h3>
              <p style={{ fontSize: "0.85rem", color: "#d1d5db", marginBottom: "1.5rem", lineHeight: "1.4" }}>
                Accès interdit aux zombies. Trouvez le GameMaster pour réclamer une rédemption.
              </p>
              <button
                type="button"
                className="btn-cartoon btn-red"
                style={{ width: "100%", height: "44px" }}
                onClick={() => setShowZombieFountainModal(false)}
              >
                Retourner Hanter le Camping
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE : CONFIRMATION DE MORSURE ZOMBIE */}
      <AnimatePresence>
        {showZombieBiteConfirmModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.85)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}>
            <div className="card-cartoon glow-zombie" style={{ width: "100%", maxWidth: "340px", textAlign: "center", border: "3px solid var(--color-zombie)" }}>
              <h3 style={{ color: "var(--color-zombie)", marginBottom: "1rem", fontFamily: "var(--font-title)" }}>INFECTION EN COURS ? 🧟</h3>
              <p style={{ fontSize: "0.85rem", color: "#d1d5db", marginBottom: "1.2rem", lineHeight: "1.4" }}>
                Es-tu sûr d'avoir planté tes dents dans <strong>{getPlayerDisplayName(zombieVictim)}</strong> ?
                <br />
                <span style={{ color: "var(--color-green)", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px", fontWeight: "bold" }}>Récompense : +50 <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.4em", height: "1.4em", verticalAlign: "middle" }} /> | Rédemption : +1.0 ❤️</span>
              </p>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-cartoon btn-red animate-pulse"
                  style={{ flex: 1, height: "44px", backgroundColor: "#b91c1c", border: "2px solid #000" }}
                  onClick={confirmZombieBite}
                >
                  Mordre !
                </button>
                <button
                  type="button"
                  className="btn-cartoon"
                  style={{ flex: 1, height: "44px", backgroundColor: "#4b5563" }}
                  onClick={() => setShowZombieBiteConfirmModal(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {floatingScore && !lowPerfMode && (
        <div 
          className="floating-score-animation"
          style={{
            position: "fixed",
            top: "45%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#fbbf24",
            fontSize: "2.8rem",
            fontFamily: "var(--font-title)",
            textShadow: "3px 3px 0 #000, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000",
            zIndex: 99999,
            pointerEvents: "none"
          }}
        >
          +{floatingScore.amount} <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.4em", height: "1.4em", verticalAlign: "middle" }} />
        </div>
      )}

      {offlineQueue && offlineQueue.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "64px",
            left: 0,
            right: 0,
            backgroundColor: "#f97316",
            color: "#000",
            textAlign: "center",
            padding: "6px 12px",
            fontSize: "0.75rem",
            fontWeight: "bold",
            borderTop: "3px solid #000",
            borderBottom: "3px solid #000",
            zIndex: 999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "6px",
            animation: "pulse 2s infinite"
          }}
        >
          <span>⏳ {offlineQueue.length} action{offlineQueue.length > 1 ? "s" : ""} en attente de synchronisation...</span>
        </div>
      )}

      {/* Barre de navigation basse */}
      <nav className="bottom-nav">
        <div
          className={`bottom-nav-item ${activeTab === "suggestion" ? "active" : ""}`}
          onClick={() => setActiveTab("suggestion")}
          aria-label="Proposer un défi"
          data-tuto="nav-suggestion"
        >
          <span style={{ fontSize: "1.6rem" }}>💡</span>
        </div>
        <div
          className={`bottom-nav-item ${activeTab === "source" ? "active" : ""}`}
          onClick={() => {
            if (isZombie) {
              setShowZombieFountainModal(true);
            } else {
              setActiveTab("source");
            }
          }}
          aria-label="Soins à la Source"
          data-tuto="nav-source"
        >
          <span style={{ fontSize: "1.6rem" }}>{isZombie ? "⛲🔒" : "⛲"}</span>
        </div>
        <div
          className={`bottom-nav-item ${activeTab === "contrat" ? "active" : ""}`}
          onClick={() => setActiveTab("contrat")}
          aria-label="Fiche de Contrat"
          data-tuto="nav-contrat"
        >
          <span style={{ fontSize: "1.6rem" }}>🎯</span>
        </div>
        <div
          className={`bottom-nav-item ${activeTab === "classement" ? "active" : ""}`}
          onClick={() => setActiveTab("classement")}
          aria-label="Classement et Flux d'actualités"
          data-tuto="nav-classement"
        >
          <span style={{ fontSize: "1.6rem" }}>🏆</span>
        </div>
      </nav>

    </div>
  );
}
