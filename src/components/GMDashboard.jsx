import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useGame } from "../context/GameContext";
import { supabase } from "../services/supabaseClient";
import Leaderboard, { getRank } from "./Leaderboard";
import { Check, X, Users, Award, Shield, FileText, Smartphone, Plus, Minus, Trash, RefreshCw, Play, XOctagon, LogOut } from "lucide-react";

export default function GMDashboard() {
  const {
    gameState,
    gameCode,
    loading,
    startGame,
    approveHit,
    rejectHit,
    resolveCounterAttack,
    approveZombieBite,
    freezePlayer,
    unfreezePlayer,
    roosterCrow,
    resetPlayerPin,
    removePlayer,
    resurrectPlayer,
    killPlayer,
    suggestAction,
    logOut,
    manualRefresh,
    showToast
  } = useGame();

  // Onglet GM actif : 'arbitrage', 'defis', 'partage', 'membres', 'classement'
  const [gmTab, setGmTab] = useState("arbitrage");

  // Mode Dieu - Joueur en cours d'édition
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editScore, setEditScore] = useState(0);
  const [editLives, setEditLives] = useState(7.0);
  const [editZombie, setEditZombie] = useState(false);
  const [editFrozen, setEditFrozen] = useState(false);
  const [editFountainUses, setEditFountainUses] = useState(0);
  const [editFountainRefreshes, setEditFountainRefreshes] = useState(0);
  const [editSkips, setEditSkips] = useState(0);
  const [securesPin, setSecuresPin] = useState("");

  // Pool de défis - Ajout / Édition
  const [showAddDefiForm, setShowAddDefiForm] = useState(false);
  const [editingDefi, setEditingDefi] = useState(null);
  const [modificationsSuggestions, setModificationsSuggestions] = useState({}); // { id: { title, desc, reward, damage } }
  const [defiTitle, setDefiTitle] = useState("");
  const [defiDesc, setDefiDesc] = useState("");
  const [defiReward, setDefiReward] = useState(100);
  const [defiDamage, setDefiDamage] = useState(1.5);
  const [defiZombieOnly, setDefiZombieOnly] = useState(false);
  const [defiType, setDefiType] = useState("mission"); // 'mission', 'fountain_action', 'fountain_truth'
  const [showFinishGameModal, setShowFinishGameModal] = useState(false);
  const [finishGameInput, setFinishGameInput] = useState("");

  // Filtrer les événements de l'historique en attente (pending)
  const pendingHits = gameState.history.filter(h => h.status === "pending" && h.type === "hit_declared");
  const pendingCounters = gameState.history.filter(h => h.status === "pending" && h.type === "counter_attack_pending");

  const pendingArbitrages = [
    ...pendingHits.map(h => ({ ...h, arbitrageType: "validation" })),
    ...pendingCounters.map(c => ({ ...c, arbitrageType: "accusation" }))
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const formatEventTime = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };
  const pendingSuggestions = gameState.actionPool.filter(a => a.createdByPlayer !== null && a.scoreReward === 0); // suggestions non arbitrées ? 
  // En fait, dans notre modèle, si created_by_player est rempli, et que le GM doit l'arbitrer :
  // Le joueur suggère un défi. Il est inséré dans action_pools. Pour savoir s'il est pending, on peut regarder si score_reward est à 0 par exemple, ou si on a un flag.
  // Dans notre schema_v2.sql, les suggestions vont directement dans `action_pools` (avec created_by_player rempli). Mais on peut filtrer si on veut.
  // Une façon plus simple : les suggestions de défis créent une entrée dans public.history avec le type 'suggest_action' et status 'pending'.
  // Regardons comment GameContext gère la suggestion :
  // `executeQueueItem` insère directement dans `action_pools`. Pour la V2, c'est plus simple de dire : le joueur insère le défi dans action_pools directement, et le GM le voit dans sa liste de défis (avec la mention du pseudo créateur) et peut l'éditer, l'activer ou le supprimer !
  // C'est encore plus simple : les suggestions sont affichées dans la liste des défis du GM, marquées d'un badge "Suggéré par [Joueur]", et le GM peut l'approuver ou l'effacer.

  // Action : Démarrer la chasse
  const handleStartGame = async () => {
    try {
      await startGame();
      showToast("La chasse aux cookies est ouverte ! 🚀");
    } catch (err) {
      showToast(`Erreur : ${err.message}`);
    }
  };

  // Action : Ouvrir la modale de fin de chasse
  const handleFinishGame = () => {
    setFinishGameInput("");
    setShowFinishGameModal(true);
  };

  const executeFinishGame = async () => {
    if (finishGameInput !== "cookillers2026") {
      showToast("Code de confirmation incorrect. ❌");
      return;
    }
    // Mettre à jour games status à 'finished'
    const { error } = await supabase
      .from("games")
      .update({ status: "finished", end_time: new Date() })
      .eq("game_code", gameCode);
    if (error) {
      showToast(`Erreur : ${error.message}`);
    } else {
      // Loguer la fin
      await supabase.from("history").insert([
        { game_code: gameCode, player_name: "GM", type: "game_finished", status: "completed" }
      ]);
      showToast("Chasse figée avec succès ! Trophées décernés. 🏆");
      setShowFinishGameModal(false);
    }
  };
  const PlayerAvatar = ({ name, hasPhoto }) => {
    const { getPlayerPhoto } = useGame();
    const [photo, setPhoto] = React.useState(null);

    React.useEffect(() => {
      if (hasPhoto) {
        getPlayerPhoto(name).then(setPhoto).catch(console.error);
      } else {
        setPhoto(null);
      }
    }, [name, hasPhoto, getPlayerPhoto]);

    return (
      <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid #000", backgroundColor: "#1e1330", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "1px 1px 0 #000", flexShrink: 0, marginRight: "8px", overflow: "hidden" }}>
        {photo ? (
          <img src={photo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontFamily: "var(--font-title)", fontSize: "0.85rem", color: "#fff", lineHeight: "1" }}>
            {name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
    );
  };

  const getPlayerDisplayName = (username) => {
    if (!username) return "";
    if (username.toUpperCase() === "GM") return "GM";
    if (username.toUpperCase() === "SYSTEM") return "System";
    const found = gameState.players.find(p => p.name.toUpperCase() === username.toUpperCase());
    const raw = found ? (found.displayName || found.name) : username;
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  };
  // Action : Le Chant du Coq
  const handleRoosterCrow = async () => {
    try {
      await roosterCrow();
      showToast("Le coq a chanté ! Les survivants reçoivent +1 relance 🌀");
    } catch (err) {
      showToast(`Erreur : ${err.message}`);
    }
  };

  // Démarrer l'édition d'un défi
  const handleStartEditDefi = (defi) => {
    setEditingDefi(defi.id);
    setDefiTitle(defi.title);
    setDefiDesc(defi.description);
    setDefiReward(defi.scoreReward || 0);
    setDefiDamage(defi.damagePenalty || 0);
    setDefiZombieOnly(defi.isZombieOnly || false);
    setDefiType(defi.type || "mission");
    setShowAddDefiForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Soumission Ajout ou Modification Défi
  const handleAddDefiSubmit = async (e) => {
    e.preventDefault();
    if ((defiType === "mission" && !defiTitle) || !defiDesc) return;

    const finalTitle = defiType === "mission" ? defiTitle : (defiDesc.slice(0, 35) + "...");

    if (editingDefi) {
      // Modification de défi existant
      const { error } = await supabase
        .from("action_pools")
        .update({
          title: finalTitle,
          description: defiDesc,
          score_reward: defiType === "mission" ? defiReward : 0,
          damage_penalty: defiDamage,
          is_zombie_only: defiZombieOnly,
          type: defiType
        })
        .eq("id", editingDefi);

      if (error) {
        showToast(`Erreur modification : ${error.message}`);
      } else {
        setEditingDefi(null);
        setDefiTitle("");
        setDefiDesc("");
        setDefiReward(100);
        setDefiDamage(1.5);
        setDefiZombieOnly(false);
        setDefiType("mission");
        setShowAddDefiForm(false);
        if (defiType === "fountain_truth") {
          showToast("Vérité Fontaine mise à jour ! 💬");
        } else if (defiType === "fountain_action") {
          showToast("Action Fontaine mise à jour ! ⚡");
        } else {
          showToast("Défi mis à jour ! 🎯");
        }
        manualRefresh();
      }
    } else {
      // Ajout de nouveau défi
      const { error } = await supabase
        .from("action_pools")
        .insert([
          {
            game_code: gameCode,
            title: finalTitle,
            description: defiDesc,
            score_reward: defiType === "mission" ? defiReward : 0,
            damage_penalty: defiDamage,
            is_zombie_only: defiZombieOnly,
            type: defiType
          }
        ]);

      if (error) {
        showToast(`Erreur insertion : ${error.message}`);
      } else {
        setDefiTitle("");
        setDefiDesc("");
        setDefiReward(100);
        setDefiDamage(1.5);
        setDefiZombieOnly(false);
        setDefiType("mission");
        setShowAddDefiForm(false);
        if (defiType === "fountain_truth") {
          showToast("Nouvelle vérité Fontaine injectée dans la pool ! 💬");
        } else if (defiType === "fountain_action") {
          showToast("Nouvelle action Fontaine injectée dans la pool ! ⚡");
        } else {
          showToast("Nouveau défi injecté dans la pool ! 🎯");
        }
        manualRefresh();
      }
    }
  };

  // Suppression Défi
  const handleDeleteDefi = async (id) => {
    if (confirm("Supprimer définitivement ce défi ?")) {
      const { error } = await supabase
        .from("action_pools")
        .delete()
        .eq("id", id);

      if (error) {
        showToast(`Erreur : ${error.message}`);
      } else {
        showToast("Défi supprimé de la pool.");
        manualRefresh();
      }
    }
  };

  // Sauvegarde Mode Dieu Joueur
  const handleGodSave = async () => {
    if (!editingPlayer) return;
    try {
      let finalLives = editLives;
      const finalZombie = editZombie;
      const currentPlayer = gameState.players.find(p => p.name === editingPlayer);

      // Si on coche la case zombie, on force les PV à 0
      if (finalZombie) {
        finalLives = 0.0;
      } else {
        // Si on décoche la case zombie (résurrection), on force les PV à au moins 1.0 si le joueur était à <= 0
        if (currentPlayer && (currentPlayer.isZombie || finalLives <= 0)) {
          finalLives = Math.max(1.0, finalLives);
        }
      }

      if (currentPlayer) {
        // Enregistrer d'abord les autres métriques (skips, utilisations fontaine, etc.)
        const { error: metricsErr } = await supabase
          .from("players")
          .update({
            fountain_uses_today: editFountainUses,
            fountain_refreshes_today: editFountainRefreshes,
            skips: editSkips
          })
          .eq("game_code", gameCode)
          .eq("name", editingPlayer);
        if (metricsErr) throw metricsErr;

        if (currentPlayer.isZombie && !finalZombie) {
          // RÉSURRECTION : Le joueur passe de zombie à vivant
          await resurrectPlayer(editingPlayer, editScore, finalLives);
        } else if (!currentPlayer.isZombie && finalZombie) {
          // DÉCÈS : Le joueur vivant passe zombie
          await killPlayer(editingPlayer, editScore);
        } else {
          // Simple mise à jour des stats sans changement de statut zombie
          const { error: upErr } = await supabase
            .from("players")
            .update({
              score: editScore,
              lives: finalLives,
              is_zombie: finalZombie
            })
            .eq("game_code", gameCode)
            .eq("name", editingPlayer);

          if (upErr) throw upErr;
        }
      }

      // Gérer le gel/dégel si l'état change
      if (editFrozen !== currentPlayer.isFrozen) {
        if (editFrozen) {
          await freezePlayer(editingPlayer);
        } else {
          await unfreezePlayer(editingPlayer);
        }
      }

      setEditingPlayer(null);
      manualRefresh();
      showToast(`Matricule de ${editingPlayer} mis à jour.`);
    } catch (err) {
      showToast(`Erreur : ${err.message}`);
    }
  };

  // Reset PIN de secours
  const handleResetPin = async (name) => {
    try {
      const newPin = await resetPlayerPin(name);
      setSecuresPin(newPin);
      showToast(`PIN réinitialisé avec succès !`);
    } catch (err) {
      showToast(`Erreur : ${err.message}`);
    }
  };

  // Suppression joueur
  const handleRemovePlayer = async (name) => {
    if (confirm(`Exclure définitivement ${name} du festival ? Cela va ajuster la boucle de cible.`)) {
      try {
        await removePlayer(name);
        setEditingPlayer(null);
        showToast(`${name} a été banni du campement.`);
      } catch (err) {
        showToast(`Erreur : ${err.message}`);
      }
    }
  };

  return (
    <div className="app-container" style={{ paddingBottom: "75px" }}>
      
      {/* Header global GM */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 16px",
        backgroundColor: "rgba(30, 16, 18, 0.8)",
        borderBottom: "3px solid #000",
        position: "sticky",
        top: 0,
        zindex: 500
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "1.4rem" }}>⚖️</span>
          <span style={{ fontFamily: "var(--font-title)", fontSize: "1.1rem", textShadow: "1.5px 1.5px 0 #000" }}>
            Console Grand Juge
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Salon : <strong>{gameCode}</strong></span>
          <button
            type="button"
            onClick={() => {
              if (confirm("Voulez-vous vraiment quitter le salon GM ?")) {
                logOut();
              }
            }}
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "4px"
            }}
            title="Se déconnecter"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Boutons de contrôle globaux du jeu */}
      <div style={{ display: "flex", gap: "8px", padding: "10px" }}>
        {gameState.status === "lobby" && (
          <button
            type="button"
            className="btn-cartoon btn-green"
            style={{ flex: 1, padding: "0.6rem", fontSize: "0.8rem" }}
            disabled={gameState.players.length < 2}
            onClick={handleStartGame}
          >
            <Play size={16} /> Lancer la Chasse
          </button>
        )}

        {gameState.status === "active" && (
          <>
            <button
              type="button"
              className="btn-cartoon btn-cyan"
              style={{ flex: 1, padding: "0.6rem", fontSize: "0.8rem" }}
              onClick={handleRoosterCrow}
            >
              <RefreshCw size={16} /> Chant du Coq
            </button>
            <button
              type="button"
              className="btn-cartoon btn-red"
              style={{ flex: 1, padding: "0.6rem", fontSize: "0.8rem" }}
              onClick={handleFinishGame}
            >
              <XOctagon size={16} /> Figer la Chasse
            </button>
          </>
        )}

        {gameState.status === "finished" && (
          <div style={{ flex: 1, textAlign: "center", color: "#fbbf24", fontWeight: "bold", border: "2px solid #fbbf24", borderRadius: "8px", padding: "4px" }}>
            Chasse Terminée 🏆
          </div>
        )}
      </div>

      {/* --- 1. ONGLET ARBITRAGE 🛡️ --- */}
      {gmTab === "arbitrage" && (
        <div className="card-cartoon glow-purple" style={{ margin: "10px" }}>
          <h2 style={{ color: "var(--color-purple)", textAlign: "center", width: "100%", marginBottom: "1rem" }}>
            Arbitrage des Requêtes 🛡️
          </h2>

          {pendingArbitrages.length === 0 ? (
            <p style={{ textAlign: "center", color: "#9ca3af", fontStyle: "italic", padding: "20px 0" }}>
              Aucune demande de neutralisation ou accusation à trancher pour le moment. Le camping dort.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {pendingArbitrages.map((item) => {
                if (item.arbitrageType === "validation") {
                  const zombieAttack = gameState.players.find(p => p.name === item.playerName)?.isZombie;
                  return (
                    <div key={item.id} style={{ border: "2px solid #000", borderRadius: "12px", padding: "10px", backgroundColor: "#1e172e", boxShadow: "2px 2px 0 #000", position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px dashed rgba(255,255,255,0.1)", paddingBottom: "6px" }}>
                        <span className="rarity-badge" style={{ backgroundColor: "rgba(168, 85, 247, 0.15)", border: "1px solid var(--color-purple)", color: "var(--color-purple)", fontSize: "0.65rem", padding: "2px 6px" }}>
                          Demande de Validation
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: "bold" }}>
                          🕒 {formatEventTime(item.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>
                        {zombieAttack ? (
                          <>
                            <strong>🧟 [Zombie] {getPlayerDisplayName(item.playerName)}</strong> déclare avoir mordu <strong>{getPlayerDisplayName(item.targetName)}</strong> !
                          </>
                        ) : (
                          <>
                            <strong>⚔️ {getPlayerDisplayName(item.playerName)}</strong> déclare avoir neutralisé <strong>{getPlayerDisplayName(item.targetName)}</strong> !
                          </>
                        )}
                        <br/>
                        Défi : <em>« {item.actionTitle} »</em>
                      </p>
                      {item.hasPhotoProof && (
                        <div style={{ marginTop: "4px" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-cyan)" }}>📸 Preuve photo jointe</span>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                        <button
                          type="button"
                          className="btn-cartoon btn-green"
                          style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem" }}
                          onClick={() => zombieAttack ? approveZombieBite(item.id) : approveHit(item.id)}
                        >
                          Accepter
                        </button>
                        <button
                          type="button"
                          className="btn-cartoon btn-red"
                          style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem" }}
                          onClick={() => rejectHit(item.id)}
                        >
                          Rejeter
                        </button>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={item.id} style={{ border: "2px solid #000", borderRadius: "12px", padding: "10px", backgroundColor: "#1e172e", boxShadow: "2px 2px 0 #000", position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px dashed rgba(255,255,255,0.1)", paddingBottom: "6px" }}>
                        <span className="rarity-badge" style={{ backgroundColor: "rgba(236, 72, 153, 0.15)", border: "1px solid #ec4899", color: "#ec4899", fontSize: "0.65rem", padding: "2px 6px" }}>
                          Dénonciation / Accusation
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: "bold" }}>
                          🕒 {formatEventTime(item.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>
                        <strong>{getPlayerDisplayName(item.playerName)}</strong> accuse <strong>{getPlayerDisplayName(item.targetName)}</strong> de vouloir lui faire accomplir :<br/>
                        <em>« {item.actionTitle} »</em>
                      </p>
                      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                        <button
                          type="button"
                          className="btn-cartoon btn-green"
                          style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem" }}
                          onClick={() => resolveCounterAttack(item.id, true)}
                        >
                          Verdict CORRECT
                        </button>
                        <button
                          type="button"
                          className="btn-cartoon btn-red"
                          style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem" }}
                          onClick={() => resolveCounterAttack(item.id, false)}
                        >
                          Fausse Accusation
                        </button>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      )}

      {/* --- 2. ONGLET DÉFIS 📖 --- */}
      {gmTab === "defis" && (
        <div className="card-cartoon glow-purple" style={{ margin: "10px" }}>
          
          {/* Modération des suggestions des joueurs */}
          {gameState.history.filter(h => h.type === "suggestion_pending" && h.status === "pending").length > 0 && (
            <div style={{ border: "2px solid var(--color-purple)", borderRadius: "12px", padding: "12px", backgroundColor: "#1e1330", marginBottom: "1.5rem", textAlign: "left", boxShadow: "3px 3px 0 #000" }}>
              <h3 style={{ fontSize: "0.95rem", color: "var(--color-purple)", margin: "0 0 8px 0", fontFamily: "var(--font-title)", textTransform: "uppercase" }}>
                Modération Suggestions 💡 ({gameState.history.filter(h => h.type === "suggestion_pending" && h.status === "pending").length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {gameState.history.filter(h => h.type === "suggestion_pending" && h.status === "pending").map((s) => {
                  const parts = s.photoProof ? s.photoProof.split("|") : [];
                  let extractedType = parts.length > 1 ? parts[0] : "mission";
                  const cleanDesc = parts.length > 1 ? parts.slice(1).join("|") : s.photoProof;

                  // Détection par fallback si le préfixe est absent mais que le score de gain est de 0
                  if (extractedType === "mission" && s.scoreReward === 0) {
                    const checkText = ((s.actionTitle || "") + " " + (cleanDesc || "")).toLowerCase();
                    if (checkText.includes("?") || checkText.includes("vérité") || checkText.includes("confess") || checkText.includes("raconte")) {
                      extractedType = "fountain_truth";
                    } else {
                      extractedType = "fountain_action";
                    }
                  }

                  let typeLabel = "🎯 Mission";
                  let typeColor = "var(--color-purple)";
                  if (extractedType === "fountain_action") {
                    typeLabel = "⚡ Action";
                    typeColor = "var(--color-cyan)";
                  } else if (extractedType === "fountain_truth") {
                    typeLabel = "💬 Vérité";
                    typeColor = "#10b981";
                  }

                  // Initialiser l'état local de modification si absent
                  if (!modificationsSuggestions[s.id]) {
                    modificationsSuggestions[s.id] = {
                      title: s.actionTitle,
                      desc: cleanDesc,
                      reward: extractedType === "mission" ? s.scoreReward : 0,
                      damage: s.damagePenalty,
                      isZombieOnly: s.isZombieOnly || false
                    };
                  }

                  const mod = modificationsSuggestions[s.id];

                  const updateMod = (field, val) => {
                    setModificationsSuggestions(prev => ({
                      ...prev,
                      [s.id]: {
                        ...prev[s.id],
                        [field]: val
                      }
                    }));
                  };

                  return (
                    <div key={s.id} style={{ border: "1px solid rgba(168, 85, 247, 0.4)", borderRadius: "8px", padding: "8px", backgroundColor: "#100a1c" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                          Proposé par : <strong>{getPlayerDisplayName(s.playerName)}</strong>
                        </span>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {s.isZombieOnly && (
                            <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(22, 101, 52, 0.2)", border: "1px solid var(--color-zombie)", color: "var(--color-zombie)", fontWeight: "bold" }}>
                              🧟 Zombie
                            </span>
                          )}
                          <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.05)", border: `1px solid ${typeColor}`, color: typeColor, fontWeight: "bold" }}>
                            {typeLabel}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                        {extractedType === "mission" && (
                          <input
                            type="text"
                            value={mod.title}
                            onChange={(e) => updateMod("title", e.target.value)}
                            placeholder="Intitulé"
                            style={{ width: "100%", padding: "4px 8px", backgroundColor: "#1c192d", border: "1.5px solid #000", borderRadius: "6px", color: "#fff", fontSize: "0.85rem" }}
                          />
                        )}
                        <textarea
                          value={mod.desc}
                          onChange={(e) => updateMod("desc", e.target.value)}
                          placeholder="Description"
                          style={{ width: "100%", height: "48px", padding: "4px 8px", backgroundColor: "#1c192d", border: "1.5px solid #000", borderRadius: "6px", color: "#fff", fontSize: "0.8rem" }}
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", marginTop: "6px" }}>
                        <div style={{ width: "100%" }}>
                          {extractedType === "mission" ? (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                              {/* Reward 🪙 (Aligné Gauche) */}
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.4em", height: "1.4em", verticalAlign: "middle" }} />
                                <button
                                  type="button"
                                  className="btn-cartoon"
                                  style={{ padding: "2px 6px", fontSize: "0.7rem", backgroundColor: "var(--color-purple)", color: "#fff", border: "1.5px solid #000", boxShadow: "1px 1px 0 #000" }}
                                  onClick={() => updateMod("reward", Math.max(50, mod.reward - 50))}
                                  disabled={mod.reward <= 50}
                                >
                                  -
                                </button>
                                <span style={{ fontFamily: "var(--font-title)", minWidth: "30px", textAlign: "center", fontSize: "0.8rem", color: "#fff" }}>{mod.reward}</span>
                                <button
                                  type="button"
                                  className="btn-cartoon"
                                  style={{ padding: "2px 6px", fontSize: "0.7rem", backgroundColor: "var(--color-purple)", color: "#fff", border: "1.5px solid #000", boxShadow: "1px 1px 0 #000" }}
                                  onClick={() => updateMod("reward", Math.min(600, mod.reward + 50))}
                                  disabled={mod.reward >= 600}
                                >
                                  +
                                </button>
                              </div>

                              {/* Damage ❤️ (Aligné Droite) */}
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <span>❤️</span>
                                <button
                                  type="button"
                                  className="btn-cartoon"
                                  style={{ padding: "2px 6px", fontSize: "0.7rem", backgroundColor: "var(--color-purple)", color: "#fff", border: "1.5px solid #000", boxShadow: "1px 1px 0 #000" }}
                                  onClick={() => updateMod("damage", Math.max(0.5, mod.damage - 0.5))}
                                  disabled={mod.damage <= 0.5}
                                >
                                  -
                                </button>
                                <span style={{ fontFamily: "var(--font-title)", minWidth: "25px", textAlign: "center", fontSize: "0.8rem", color: "#fff" }}>{mod.damage}</span>
                                <button
                                  type="button"
                                  className="btn-cartoon"
                                  style={{ padding: "2px 6px", fontSize: "0.7rem", backgroundColor: "var(--color-purple)", color: "#fff", border: "1.5px solid #000", boxShadow: "1px 1px 0 #000" }}
                                  onClick={() => updateMod("damage", Math.min(7.0, mod.damage + 0.5))}
                                  disabled={mod.damage >= 7.0}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Soin Fontaine pour action/verité : Sélection 3 étoiles */
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Soin :</span>
                              <button
                                type="button"
                                className="btn-cartoon"
                                style={{ padding: "2px 6px", fontSize: "0.7rem", backgroundColor: "var(--color-purple)", color: "#fff", border: "1.5px solid #000", boxShadow: "1px 1px 0 #000" }}
                                onClick={() => {
                                  if (mod.damage === 3.0) updateMod("damage", 1.5);
                                  else if (mod.damage === 1.5) updateMod("damage", 0.5);
                                }}
                                disabled={mod.damage === 0.5}
                              >
                                -
                              </button>
                              <div style={{ display: "flex", gap: "2px" }}>
                                <span style={{ color: "#f59e0b", fontSize: "1.1rem" }}>★</span>
                                <span style={{ color: mod.damage >= 1.5 ? "#f59e0b" : "#4b5563", fontSize: "1.1rem" }}>★</span>
                                <span style={{ color: mod.damage >= 3.0 ? "#f59e0b" : "#4b5563", fontSize: "1.1rem" }}>★</span>
                              </div>
                              <button
                                type="button"
                                className="btn-cartoon"
                                style={{ padding: "2px 6px", fontSize: "0.7rem", backgroundColor: "var(--color-purple)", color: "#fff", border: "1.5px solid #000", boxShadow: "1px 1px 0 #000" }}
                                onClick={() => {
                                  if (mod.damage === 0.5) updateMod("damage", 1.5);
                                  else if (mod.damage === 1.5) updateMod("damage", 3.0);
                                }}
                                disabled={mod.damage === 3.0}
                              >
                                +
                              </button>
                              <span style={{ fontSize: "0.7rem", color: "var(--color-cyan)" }}>
                                (+{mod.damage} ❤️)
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Boutons d'action dessous alignés à droite */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", width: "100%", marginTop: "10px", borderTop: "1px dashed rgba(255,255,255,0.05)", paddingTop: "6px" }}>
                          <button
                            type="button"
                            className="btn-cartoon btn-green"
                            style={{ padding: "4px 12px", fontSize: "0.75rem" }}
                            onClick={async () => {
                              if (!mod.desc || !mod.desc.trim()) {
                                showToast("La description ne peut pas être vide !");
                                return;
                              }
                              if (extractedType === "mission" && (!mod.title || !mod.title.trim())) {
                                showToast("Le titre est requis pour une mission !");
                                return;
                              }
                              const finalTitle = extractedType === "mission" ? mod.title : (mod.desc.slice(0, 35) + "...");
                              // Valider : insérer dans action_pools avec les modifications du GM
                              const { error: insErr } = await supabase.from("action_pools").insert([
                                {
                                  game_code: gameCode,
                                  title: finalTitle,
                                  description: mod.desc.trim(),
                                  score_reward: extractedType === "mission" ? mod.reward : 0,
                                  damage_penalty: mod.damage,
                                  is_zombie_only: s.isZombieOnly || false,
                                  type: extractedType,
                                  created_by_player: s.playerName
                                }
                              ]);
                              if (insErr) {
                                showToast(`Erreur : ${insErr.message}`);
                                return;
                              }
                              // Marquer history comme completed
                              await supabase.from("history").update({ status: "completed" }).eq("id", s.id);
                              showToast("Suggestion intégrée au catalogue de jeu ! ✓");
                              manualRefresh();
                            }}
                          >
                            Valider
                          </button>
                          <button
                            type="button"
                            className="btn-cartoon btn-red"
                            style={{ padding: "4px 12px", fontSize: "0.75rem" }}
                            onClick={async () => {
                              // Rejeter : marquer comme rejected dans history
                              await supabase.from("history").update({ status: "rejected" }).eq("id", s.id);
                              showToast("Suggestion rejetée.");
                              manualRefresh();
                            }}
                          >
                            Rejeter
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ color: "var(--color-purple)", margin: 0 }}>Pool de Défis 📖</h2>
            <button
              type="button"
              className="btn-cartoon btn-cyan"
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
              onClick={() => {
                setEditingDefi(null);
                setDefiTitle("");
                setDefiDesc("");
                setDefiReward(100);
                setDefiDamage(1.5);
                setDefiZombieOnly(false);
                setShowAddDefiForm(!showAddDefiForm);
              }}
            >
              {showAddDefiForm ? "Fermer" : "Ajouter +"}
            </button>
          </div>

          {/* Formulaire ajout/édition défi */}
          {showAddDefiForm && (
            <form onSubmit={handleAddDefiSubmit} style={{ border: "2px solid #000", padding: "12px", borderRadius: "12px", marginBottom: "1.5rem", backgroundColor: "#1c192d" }}>
              <h3 style={{ fontSize: "1rem", margin: "0 0 10px 0", color: "#fff", transform: "none", textShadow: "none", textAlign: "left" }}>
                {editingDefi ? "Modifier le Défi" : "Ajouter un Défi"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "left" }}>
                <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
                  <button
                    type="button"
                    style={{ flex: 1, padding: "6px", fontSize: "0.7rem", border: "2px solid #000", borderRadius: "8px", backgroundColor: defiType === "mission" ? "var(--color-cyan)" : "#100e1f", color: defiType === "mission" ? "#000" : "#fff", fontWeight: "bold", cursor: "pointer" }}
                    onClick={() => { setDefiType("mission"); setDefiTitle(""); setDefiReward(100); setDefiDamage(1.5); }}
                  >
                    Mission 🎯
                  </button>
                  <button
                    type="button"
                    style={{ flex: 1, padding: "6px", fontSize: "0.7rem", border: "2px solid #000", borderRadius: "8px", backgroundColor: defiType === "fountain_action" ? "var(--color-cyan)" : "#100e1f", color: defiType === "fountain_action" ? "#000" : "#fff", fontWeight: "bold", cursor: "pointer" }}
                    onClick={() => { setDefiType("fountain_action"); setDefiTitle(""); setDefiReward(0); setDefiDamage(0.5); }}
                  >
                    Action ⚡
                  </button>
                  <button
                    type="button"
                    style={{ flex: 1, padding: "6px", fontSize: "0.7rem", border: "2px solid #000", borderRadius: "8px", backgroundColor: defiType === "fountain_truth" ? "var(--color-cyan)" : "#100e1f", color: defiType === "fountain_truth" ? "#000" : "#fff", fontWeight: "bold", cursor: "pointer" }}
                    onClick={() => { setDefiType("fountain_truth"); setDefiTitle(""); setDefiReward(0); setDefiDamage(0.5); }}
                  >
                    Vérité 💬
                  </button>
                </div>

                {defiType === "mission" && (
                  <input
                    type="text"
                    placeholder="Intitulé du Défi"
                    value={defiTitle}
                    onChange={(e) => setDefiTitle(e.target.value)}
                    style={{ width: "100%", padding: "6px", backgroundColor: "#100e1f", border: "2px solid #000", borderRadius: "6px", color: "#fff" }}
                    required
                  />
                )}
                <textarea
                  placeholder={defiType === "fountain_truth" ? "Votre question à poser..." : "Description du défi / action à réaliser..."}
                  value={defiDesc}
                  onChange={(e) => setDefiDesc(e.target.value)}
                  style={{ width: "100%", height: "60px", padding: "6px", backgroundColor: "#100e1f", border: "2px solid #000", borderRadius: "6px", color: "#fff" }}
                  required
                />
                
                {defiType === "mission" ? (
                  <div style={{ display: "flex", gap: "8px", justifyContent: "space-between", alignItems: "center" }}>
                    {/* Points 🍪 */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1 }}>
                      <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.2rem", height: "1.2rem", verticalAlign: "middle" }} />
                      <button
                        type="button"
                        className="btn-cartoon"
                        style={{ padding: "2px 8px", fontSize: "0.8rem", backgroundColor: "var(--color-purple)", color: "#fff", border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}
                        onClick={() => setDefiReward(Math.max(50, defiReward - 50))}
                        disabled={defiReward <= 50}
                      >
                        -
                      </button>
                      <span style={{ fontFamily: "var(--font-title)", minWidth: "40px", textAlign: "center", color: "#fff", fontSize: "0.9rem" }}>{defiReward}</span>
                      <button
                        type="button"
                        className="btn-cartoon"
                        style={{ padding: "2px 8px", fontSize: "0.8rem", backgroundColor: "var(--color-purple)", color: "#fff", border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}
                        onClick={() => setDefiReward(Math.min(600, defiReward + 50))}
                        disabled={defiReward >= 600}
                      >
                        +
                      </button>
                    </div>

                    {/* Dégâts ❤️ */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1 }}>
                      <span style={{ fontSize: "0.95rem" }}>❤️</span>
                      <button
                        type="button"
                        className="btn-cartoon"
                        style={{ padding: "2px 8px", fontSize: "0.8rem", backgroundColor: "var(--color-purple)", color: "#fff", border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}
                        onClick={() => setDefiDamage(Math.max(0.5, defiDamage - 0.5))}
                        disabled={defiDamage <= 0.5}
                      >
                        -
                      </button>
                      <span style={{ fontFamily: "var(--font-title)", minWidth: "30px", textAlign: "center", color: "#fff", fontSize: "0.9rem" }}>{defiDamage}</span>
                      <button
                        type="button"
                        className="btn-cartoon"
                        style={{ padding: "2px 8px", fontSize: "0.8rem", backgroundColor: "var(--color-purple)", color: "#fff", border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}
                        onClick={() => setDefiDamage(Math.min(7.0, defiDamage + 0.5))}
                        disabled={defiDamage >= 7.0}
                      >
                        +
                      </button>
                    </div>
                  </div>
                 ) : (
                   /* Soin Fontaine pour action/verité : Sélection 3 étoiles GM */
                   <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                     <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--color-cyan)", fontWeight: "bold" }}>
                       <span>Difficulté / Soin :</span>
                       <span>
                         {defiDamage === 0.5 ? "Jus de Chaussette (+0.5 ❤️)" : 
                          defiDamage === 1.5 ? "Élixir du Barman (+1.5 ❤️)" : 
                          "Larmes de VIP (+3.0 ❤️)"}
                       </span>
                     </div>
                     <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                       <button
                         type="button"
                         className="btn-cartoon"
                         style={{ padding: "4px 10px", fontSize: "0.8rem", backgroundColor: "var(--color-purple)", color: "#fff", border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}
                         onClick={() => {
                           if (defiDamage === 3.0) setDefiDamage(1.5);
                           else if (defiDamage === 1.5) setDefiDamage(0.5);
                         }}
                         disabled={defiDamage === 0.5}
                       >
                         -
                       </button>
                       <div style={{ display: "flex", gap: "4px", margin: "0 8px" }}>
                         <span style={{ color: "#f59e0b", fontSize: "1.4rem", textShadow: "1px 1px 0 #000" }}>★</span>
                         <span style={{ color: defiDamage >= 1.5 ? "#f59e0b" : "#4b5563", fontSize: "1.4rem", textShadow: "1px 1px 0 #000" }}>★</span>
                         <span style={{ color: defiDamage >= 3.0 ? "#f59e0b" : "#4b5563", fontSize: "1.4rem", textShadow: "1px 1px 0 #000" }}>★</span>
                       </div>
                       <button
                         type="button"
                         className="btn-cartoon"
                         style={{ padding: "4px 10px", fontSize: "0.8rem", backgroundColor: "var(--color-purple)", color: "#fff", border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}
                         onClick={() => {
                           if (defiDamage === 0.5) setDefiDamage(1.5);
                           else if (defiDamage === 1.5) setDefiDamage(3.0);
                         }}
                         disabled={defiDamage === 3.0}
                       >
                         +
                       </button>
                     </div>
                   </div>
                 )}

                 {defiType === "mission" && (
                   <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", marginBottom: "4px" }}>
                     <button
                       type="button"
                       onClick={() => setDefiZombieOnly(prev => !prev)}
                       style={{
                         width: "38px",
                         height: "38px",
                         borderRadius: "50%",
                         border: defiZombieOnly ? "3px solid var(--color-zombie)" : "3px solid #374151",
                         backgroundColor: defiZombieOnly ? "rgba(74, 222, 128, 0.25)" : "#110e20",
                         display: "flex",
                         alignItems: "center",
                         justifyContent: "center",
                         fontSize: "1.2rem",
                         cursor: "pointer",
                         boxShadow: defiZombieOnly ? "0 0 8px rgba(74, 222, 128, 0.4), 2px 2px 0 #000" : "2px 2px 0 #000",
                         transition: "all 0.15s ease",
                         padding: 0
                       }}
                       title="Défi Zombie uniquement"
                     >
                       🧟
                     </button>
                     <span style={{ fontSize: "0.75rem", color: defiZombieOnly ? "var(--color-zombie)" : "#9ca3af", fontWeight: "bold" }}>
                       Défi Zombie Uniquement
                     </span>
                   </div>
                 )}
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button type="submit" className="btn-cartoon btn-green" style={{ flex: 1, padding: "0.5rem" }}>
                    {editingDefi ? "Sauvegarder" : "Injecter"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Liste défis GM */}
          {(() => {
            const renderDefiRow = (a) => (
              <div
                key={a.id}
                style={{
                  border: "2px solid #000",
                  borderRadius: "12px",
                  padding: "8px 10px",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div 
                  style={{ textAlign: "left", flex: 1, marginRight: "10px", cursor: "pointer" }}
                  onClick={() => handleStartEditDefi(a)}
                  title="Cliquer pour modifier ce défi"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
                      {a.type === "fountain_action" ? "Action" : (a.type === "fountain_truth" ? "Vérité" : a.title)}
                    </div>
                    {a.isZombieOnly && (
                      <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "6px", backgroundColor: "rgba(22, 101, 52, 0.2)", border: "1.5px solid var(--color-zombie)", color: "var(--color-zombie)", fontWeight: "bold" }}>
                        🧟 Zombie
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontStyle: "italic" }}>{a.description}</div>
                  <div style={{ fontSize: "0.7rem", fontWeight: "bold", color: "#fbbf24", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                    {a.type === "mission" || !a.type ? (
                      <>
                         +{a.scoreReward} <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.4em", height: "1.4em", verticalAlign: "middle" }} /> | -{a.damagePenalty} ❤️
                      </>
                    ) : (
                      <>Soin : +{a.damagePenalty} ❤️</>
                    )}
                  </div>
                  {a.createdByPlayer && a.createdByPlayer.toUpperCase() !== "GM" && (
                    <span style={{ fontSize: "0.65rem", color: "var(--color-cyan)", display: "block", marginTop: "2px" }}>
                      Proposé par {getPlayerDisplayName(a.createdByPlayer)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteDefi(a.id)}
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    border: "2px solid var(--color-red)",
                    color: "var(--color-red)",
                    borderRadius: "8px",
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}
                >
                  <Trash size={12} />
                </button>
              </div>
            );

            const gmActiveMissions = gameState.actionPool.filter(a => a.type === "mission" || !a.type);
            const gmFountainActions = gameState.actionPool.filter(a => a.type === "fountain_action");
            const gmFountainTruths = gameState.actionPool.filter(a => a.type === "fountain_truth");

            return (
              <>
                <h3 style={{ fontSize: "0.85rem", color: "#d1d5db", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "4px", marginBottom: "12px", textAlign: "left" }}>
                  Pool Globale de Défis ({gameState.actionPool.length})
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "1.5rem" }}>
                  <div>
                    <h4 style={{ fontSize: "0.75rem", color: "var(--color-purple)", marginBottom: "6px", textAlign: "left", textTransform: "uppercase" }}>Missions Actives 🎯 ({gmActiveMissions.length})</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {gmActiveMissions.map(renderDefiRow)}
                      {gmActiveMissions.length === 0 && (
                        <span style={{ fontSize: "0.7rem", color: "#9ca3af", fontStyle: "italic", textAlign: "left", display: "block" }}>Aucune mission active</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: "0.75rem", color: "var(--color-cyan)", marginBottom: "6px", textAlign: "left", textTransform: "uppercase" }}>Actions Fontaine ⚡ ({gmFountainActions.length})</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {gmFountainActions.map(renderDefiRow)}
                      {gmFountainActions.length === 0 && (
                        <span style={{ fontSize: "0.7rem", color: "#9ca3af", fontStyle: "italic", textAlign: "left", display: "block" }}>Aucune action Fontaine</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: "0.75rem", color: "#10b981", marginBottom: "6px", textAlign: "left", textTransform: "uppercase" }}>Vérités Fontaine 💬 ({gmFountainTruths.length})</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {gmFountainTruths.map(renderDefiRow)}
                      {gmFountainTruths.length === 0 && (
                        <span style={{ fontSize: "0.7rem", color: "#9ca3af", fontStyle: "italic", textAlign: "left", display: "block" }}>Aucune vérité Fontaine</span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* --- 3. ONGLET PARTAGE 📱 --- */}
      {gmTab === "partage" && (
        <div className="card-cartoon glow-cyan" style={{ margin: "10px", textAlign: "center" }}>
          <h2 style={{ color: "var(--color-cyan)", marginBottom: "1rem" }}>Partager le Salon 📱</h2>
          <p style={{ fontSize: "0.9rem", color: "#d1d5db", marginBottom: "1.5rem" }}>
            Communiquez le code ci-dessous aux festivaliers pour qu'ils s'inscrivent sur leur mobile :
          </p>

          <div style={{
            fontSize: "2.8rem",
            fontFamily: "var(--font-title)",
            backgroundColor: "#0d0a1b",
            border: "3px solid #000",
            borderRadius: "16px",
            padding: "1rem",
            display: "inline-block",
            boxShadow: "4px 4px 0 #000",
            letterSpacing: "0.1em",
            color: "var(--color-cyan)"
          }}>
            {gameCode}
          </div>

          {/* Lien de partage d'invitation copiable */}
          <div style={{ marginTop: "1.5rem" }}>
            <button
              type="button"
              className="btn-cartoon btn-purple"
              style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", width: "100%", maxWidth: "280px", margin: "0 auto" }}
              onClick={() => {
                const inviteUrl = `${window.location.origin}/?join=${gameCode}`;
                navigator.clipboard.writeText(inviteUrl).then(() => {
                  showToast("Lien d'invitation copié ! 📋");
                }).catch(() => {
                  showToast("Erreur lors de la copie.");
                });
              }}
            >
              📋 Copier le Lien d'invitation
            </button>
            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "6px", wordBreak: "break-all" }}>
              {window.location.origin}/?join={gameCode}
            </p>
          </div>

          <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "1.5rem" }}>
            Code de connexion du Grand Juge : <strong>0000</strong>
          </p>
        </div>
      )}

      {/* --- 4. ONGLET MEMBRES 👥 --- */}
      {gmTab === "membres" && (
        <div className="card-cartoon glow-purple" style={{ margin: "10px" }}>
          <h2 style={{ color: "var(--color-purple)", textAlign: "center", width: "100%", marginBottom: "1rem" }}>
            Gestion Mode Dieu 👥
          </h2>

          {editingPlayer ? (() => {
            const p = gameState.players.find(pl => pl.name === editingPlayer);
            const currentMission = p ? gameState.actionPool.find(a => a.id === p.actionId) : null;
            const currentMissionTitle = currentMission ? currentMission.title : "Aucune";
            const currentMissionDesc = currentMission ? currentMission.description : "";
            return (
              <div style={{ border: "2px solid var(--color-purple)", padding: "12px", borderRadius: "12px", backgroundColor: "#1d1933", textAlign: "left", position: "relative" }}>
                <button 
                  type="button" 
                  onClick={() => setEditingPlayer(null)}
                  style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                  title="Fermer"
                >
                  <X size={20}/>
                </button>

                <h3 style={{ fontSize: "1.1rem", marginBottom: "6px", transform: "none", textShadow: "none" }}>Modifier {getPlayerDisplayName(editingPlayer)}</h3>
                <div style={{ fontSize: "0.85rem", color: "#9ca3af", marginBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "8px" }}>
                  <div>Cible : <strong style={{ color: "#fbbf24" }}>{p ? (getPlayerDisplayName(p.target) || "Aucune") : "Aucune"}</strong></div>
                  <div style={{ marginTop: "4px" }}>Mission en cours : <strong style={{ color: "#ffffff" }}>{currentMissionTitle}</strong></div>
                  {currentMissionDesc && (
                    <div style={{ marginTop: "4px", fontSize: "0.75rem", fontStyle: "italic", color: "#9ca3af" }}>
                      Description : <span style={{ color: "#ffffff", fontStyle: "normal" }}>{currentMissionDesc}</span>
                    </div>
                  )}
                </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* 1. SCORE */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", width: "130px", gap: "8px", fontWeight: "bold", fontSize: "1.1rem" }}>
                    <img src="/cookie_score_icon.png" alt="🍪" style={{ width: "2.0rem", height: "2.0rem", verticalAlign: "middle" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button 
                      type="button" 
                      className="btn-cartoon" 
                      disabled={editScore <= 0}
                      style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: editScore <= 0 ? "#4b5563" : "var(--color-purple)", color: editScore <= 0 ? "#9ca3af" : "#fff", opacity: editScore <= 0 ? 0.5 : 1, cursor: editScore <= 0 ? "not-allowed" : "pointer" }} 
                      onClick={() => setEditScore(prev => Math.max(0, prev - 50))}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={editScore}
                      onChange={(e) => setEditScore(Number(e.target.value))}
                      style={{ width: "60px", padding: "6px", backgroundColor: "#100e1f", border: "2px solid #000", borderRadius: "6px", color: "#fff", textAlign: "center" }}
                    />
                    <button 
                      type="button" 
                      className="btn-cartoon" 
                      style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: "var(--color-purple)", color: "#fff" }} 
                      onClick={() => setEditScore(prev => prev + 50)}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 2. VITALITÉ */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", width: "130px", gap: "8px", fontWeight: "bold", fontSize: "1.1rem" }}>
                    <span style={{ fontSize: "1.8rem", display: "inline-block", lineHeight: 1 }}>❤️</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button 
                      type="button" 
                      className="btn-cartoon" 
                      disabled={editLives <= 0}
                      style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: editLives <= 0 ? "#4b5563" : "var(--color-purple)", color: editLives <= 0 ? "#9ca3af" : "#fff", opacity: editLives <= 0 ? 0.5 : 1, cursor: editLives <= 0 ? "not-allowed" : "pointer" }} 
                      onClick={() => setEditLives(prev => Math.max(0.0, prev - 0.5))}
                    >
                      -
                    </button>
                    <span style={{ fontFamily: "var(--font-title)", minWidth: "60px", textAlign: "center", display: "inline-block" }}>
                      {editLives}
                    </span>
                    <button 
                      type="button" 
                      className="btn-cartoon" 
                      disabled={editLives >= 7.0}
                      style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: editLives >= 7.0 ? "#4b5563" : "var(--color-purple)", color: editLives >= 7.0 ? "#9ca3af" : "#fff", opacity: editLives >= 7.0 ? 0.5 : 1, cursor: editLives >= 7.0 ? "not-allowed" : "pointer" }} 
                      onClick={() => setEditLives(prev => Math.min(7.0, prev + 0.5))}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 3. RELANCES FONTAINE (🔄) */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", width: "130px", gap: "8px", fontWeight: "bold", fontSize: "1.1rem" }}>
                    <span style={{ fontSize: "1.8rem", display: "inline-block", lineHeight: 1 }}>🔄</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button 
                      type="button" 
                      className="btn-cartoon" 
                      disabled={editFountainRefreshes <= 0}
                      style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: editFountainRefreshes <= 0 ? "#4b5563" : "var(--color-purple)", color: editFountainRefreshes <= 0 ? "#9ca3af" : "#fff", opacity: editFountainRefreshes <= 0 ? 0.5 : 1, cursor: editFountainRefreshes <= 0 ? "not-allowed" : "pointer" }} 
                      onClick={() => setEditFountainRefreshes(prev => Math.max(0, prev - 1))}
                    >
                      -
                    </button>
                    <span style={{ fontFamily: "var(--font-title)", minWidth: "60px", textAlign: "center", display: "inline-block" }}>
                      {editFountainRefreshes}
                    </span>
                    <button 
                      type="button" 
                      className="btn-cartoon" 
                      style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: "var(--color-purple)", color: "#fff" }} 
                      onClick={() => setEditFountainRefreshes(prev => prev + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 4. FONTAINE UTILISATIONS (⛲) */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", width: "130px", gap: "8px", fontWeight: "bold", fontSize: "1.1rem" }}>
                    <span style={{ fontSize: "1.8rem", display: "inline-block", lineHeight: 1 }}>⛲</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button 
                      type="button" 
                      className="btn-cartoon" 
                      disabled={editFountainUses <= 0}
                      style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: editFountainUses <= 0 ? "#4b5563" : "var(--color-purple)", color: editFountainUses <= 0 ? "#9ca3af" : "#fff", opacity: editFountainUses <= 0 ? 0.5 : 1, cursor: editFountainUses <= 0 ? "not-allowed" : "pointer" }} 
                      onClick={() => setEditFountainUses(prev => Math.max(0, prev - 1))}
                    >
                      -
                    </button>
                    <span style={{ fontFamily: "var(--font-title)", minWidth: "60px", textAlign: "center", display: "inline-block" }}>
                      {editFountainUses}/2
                    </span>
                    <button 
                      type="button" 
                      className="btn-cartoon" 
                      disabled={editFountainUses >= 2}
                      style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: editFountainUses >= 2 ? "#4b5563" : "var(--color-purple)", color: editFountainUses >= 2 ? "#9ca3af" : "#fff", opacity: editFountainUses >= 2 ? 0.5 : 1, cursor: editFountainUses >= 2 ? "not-allowed" : "pointer" }} 
                      onClick={() => setEditFountainUses(prev => Math.min(2, prev + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 5. RELANCES DÉFI (🌀) */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", width: "130px", gap: "8px", fontWeight: "bold", fontSize: "1.1rem" }}>
                    <span style={{ fontSize: "1.8rem", display: "inline-block", lineHeight: 1 }}>🌀</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button 
                      type="button" 
                      className="btn-cartoon" 
                      disabled={editSkips <= 0}
                      style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: editSkips <= 0 ? "#4b5563" : "var(--color-purple)", color: editSkips <= 0 ? "#9ca3af" : "#fff", opacity: editSkips <= 0 ? 0.5 : 1, cursor: editSkips <= 0 ? "not-allowed" : "pointer" }} 
                      onClick={() => setEditSkips(prev => Math.max(0, prev - 1))}
                    >
                      -
                    </button>
                    <span style={{ fontFamily: "var(--font-title)", minWidth: "60px", textAlign: "center", display: "inline-block" }}>
                      {editSkips}
                    </span>
                    <button 
                      type="button" 
                      className="btn-cartoon" 
                      style={{ padding: "4px 8px", fontSize: "0.8rem", backgroundColor: "var(--color-purple)", color: "#fff" }} 
                      onClick={() => setEditSkips(prev => prev + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "8px 0" }} />
              
              {/* Boutons Poussoirs Zombie / Gelé */}
              <div style={{ display: "flex", gap: "40px", margin: "12px 0", justifyContent: "center", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setEditZombie(prev => !prev)}
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      border: editZombie ? "3px solid var(--color-zombie)" : "3px solid #374151",
                      backgroundColor: editZombie ? "rgba(74, 222, 128, 0.25)" : "#110e20",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.8rem",
                      cursor: "pointer",
                      boxShadow: editZombie ? "0 0 10px rgba(74, 222, 128, 0.4), 2px 2px 0 #000" : "2px 2px 0 #000",
                      transition: "all 0.2s ease",
                      padding: 0,
                      lineHeight: "50px",
                      textAlign: "center"
                    }}
                  >
                    🧟
                  </button>
                  <span style={{ fontSize: "0.75rem", color: editZombie ? "var(--color-zombie)" : "#9ca3af", fontWeight: "bold" }}>
                    Zombie
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setEditFrozen(prev => !prev)}
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      border: editFrozen ? "3px solid var(--color-cyan)" : "3px solid #374151",
                      backgroundColor: editFrozen ? "rgba(34, 211, 238, 0.25)" : "#110e20",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.8rem",
                      cursor: "pointer",
                      boxShadow: editFrozen ? "0 0 10px rgba(34, 211, 238, 0.4), 2px 2px 0 #000" : "2px 2px 0 #000",
                      transition: "all 0.2s ease",
                      padding: 0,
                      lineHeight: "50px",
                      textAlign: "center"
                    }}
                  >
                    ❄️
                  </button>
                  <span style={{ fontSize: "0.75rem", color: editFrozen ? "var(--color-cyan)" : "#9ca3af", fontWeight: "bold" }}>
                    Gelé
                  </span>
                </div>
              </div>

                <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "8px 0" }} />

                {/* Reset PIN de secours */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                  <button
                    type="button"
                    className="btn-cartoon btn-cyan"
                    style={{ padding: "0.4rem", fontSize: "0.8rem" }}
                    onClick={() => handleResetPin(editingPlayer)}
                  >
                    Générer PIN de Secours
                  </button>
                  {securesPin && (
                    <div style={{ fontSize: "0.85rem", color: "var(--color-green)", textAlign: "center", fontWeight: "bold" }}>
                      PIN généré : {securesPin} (Transmettre de vive voix !)
                    </div>
                  )}
                </div>

                <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "8px 0" }} />

                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button type="button" className="btn-cartoon btn-green" style={{ flex: 1, padding: "0.5rem" }} onClick={handleGodSave}>Sauver</button>
                  <button type="button" className="btn-cartoon btn-red" style={{ flex: 1, padding: "0.5rem" }} onClick={() => handleRemovePlayer(editingPlayer)}>Bannir</button>
                </div>
              </div>
            );
          })() : (
            <div style={{ border: "2px solid #000", borderRadius: "12px", overflow: "hidden", backgroundColor: "#150e1f", boxShadow: "3px 3px 0 #000" }}>
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: "420px" }}>
                  {/* En-tête de la table */}
                  <div style={{ display: "flex", padding: "8px 12px", borderBottom: "2px solid #000", backgroundColor: "#1c1326", fontWeight: "bold", fontSize: "0.75rem", color: "#9ca3af", textTransform: "uppercase", alignItems: "center" }}>
                    <div style={{ flex: 2, minWidth: "120px", textAlign: "left" }}>Joueur</div>
                    <div style={{ width: "50px", display: "flex", justifyContent: "center", alignItems: "center" }} title="Score (Biscuits)"><img src="/cookie_score_icon.png" alt="🍪" style={{ width: "1.5rem", height: "1.5rem" }} /></div>
                    <div style={{ width: "50px", textAlign: "center" }} title="Vitalité / Zombie">❤️</div>
                    <div style={{ width: "55px", textAlign: "center" }} title="Relances Fontaine">🔄</div>
                    <div style={{ width: "50px", textAlign: "center" }} title="Fontaine Utilisations">⛲</div>
                    <div style={{ width: "55px", textAlign: "center" }} title="Relances Défi">🌀</div>
                  </div>
                  {/* Lignes des joueurs */}
                  {[...gameState.players]
                    .sort((a, b) => getPlayerDisplayName(a.name).localeCompare(getPlayerDisplayName(b.name)))
                    .map((p) => (
                    <div
                      key={p.name}
                      onClick={() => {
                        setEditingPlayer(p.name);
                        setEditScore(p.score);
                        setEditLives(p.lives);
                        setEditZombie(p.isZombie);
                        setEditFrozen(p.isFrozen);
                        setEditFountainUses(p.fountainUsesToday || 0);
                        setEditFountainRefreshes(p.fountainRefreshesToday || 0);
                        setEditSkips(p.skips || 0);
                        setSecuresPin("");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        padding: "8px 12px",
                        backgroundColor: p.isZombie ? "rgba(168, 85, 247, 0.05)" : "rgba(255,255,255,0.02)",
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ flex: 2, minWidth: "120px", display: "flex", alignItems: "center", textAlign: "left" }}>
                        <PlayerAvatar name={p.name} hasPhoto={p.hasPhoto} />
                        <span style={{ fontWeight: "bold", fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {getPlayerDisplayName(p.name)} {p.isZombie && "🧟"} {p.isFrozen && "❄️"}
                        </span>
                      </div>
                      <div style={{ width: "50px", textAlign: "center", color: "#fbbf24", fontWeight: "bold", fontSize: "0.85rem" }}>
                        {p.score}
                      </div>
                      <div style={{ width: "50px", textAlign: "center", fontSize: "0.85rem" }}>
                        {p.isZombie ? "💀" : `${p.lives}`}
                      </div>
                      <div style={{ width: "55px", textAlign: "center", fontSize: "0.85rem" }}>
                        {p.fountainRefreshesToday || 0}
                      </div>
                      <div style={{ width: "50px", textAlign: "center", fontSize: "0.85rem" }}>
                        {p.fountainUsesToday || 0}/2
                      </div>
                      <div style={{ width: "55px", textAlign: "center", fontSize: "0.85rem" }}>
                        {p.skips || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- 5. ONGLET CLASSEMENT 🏆 --- */}
      {gmTab === "classement" && (
        <Leaderboard players={gameState.players} history={gameState.history} />
      )}

      {/* Barre de navigation basse GM */}
      <nav className="bottom-nav" style={{ backgroundColor: "#1e1012" }}>
        <div
          className={`bottom-nav-item ${gmTab === "defis" ? "active" : ""}`}
          onClick={() => setGmTab("defis")}
        >
          <span style={{ fontSize: "1.6rem" }}>📖</span>
        </div>
        <div
          className={`bottom-nav-item ${gmTab === "arbitrage" ? "active" : ""}`}
          onClick={() => setGmTab("arbitrage")}
        >
          <span style={{ fontSize: "1.6rem" }}>🛡️</span>
        </div>
        <div
          className={`bottom-nav-item ${gmTab === "partage" ? "active" : ""}`}
          onClick={() => setGmTab("partage")}
        >
          <span style={{ fontSize: "1.6rem" }}>📱</span>
        </div>
        <div
          className={`bottom-nav-item ${gmTab === "membres" ? "active" : ""}`}
          onClick={() => setGmTab("membres")}
        >
          <span style={{ fontSize: "1.6rem" }}>👥</span>
        </div>
        <div
          className={`bottom-nav-item ${gmTab === "classement" ? "active" : ""}`}
          onClick={() => setGmTab("classement")}
        >
          <span style={{ fontSize: "1.6rem" }}>🏆</span>
        </div>
      {/* MODALE : FIGER LA CHASSE (FIN DE PARTIE GM) */}
      <AnimatePresence>
        {showFinishGameModal && (
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
            <div className="card-cartoon glow-red" style={{ width: "100%", maxWidth: "340px", textAlign: "center", border: "3px solid var(--color-red)" }}>
              <h3 style={{ color: "var(--color-red)", marginBottom: "1rem", fontFamily: "var(--font-title)" }}>FIGER LA CHASSE ? 🏆</h3>
              <p style={{ fontSize: "0.85rem", color: "#d1d5db", marginBottom: "1.2rem", lineHeight: "1.4" }}>
                ⚠️ <strong>ATTENTION :</strong> Voulez-vous vraiment clore la chasse aux cookies ? Le classement sera figé et les trophées décernés.
                <br /><br />
                Pour confirmer, veuillez saisir : <strong>cookillers2026</strong>
              </p>

              <input
                type="text"
                placeholder="Saisir cookillers2026"
                value={finishGameInput}
                onChange={(e) => setFinishGameInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "#100e1f",
                  border: "2px solid #000",
                  borderRadius: "8px",
                  color: "#fff",
                  textAlign: "center",
                  marginBottom: "1.2rem"
                }}
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-cartoon btn-red"
                  style={{ flex: 1, height: "44px", backgroundColor: "#b91c1c", border: "2px solid #000" }}
                  onClick={executeFinishGame}
                  disabled={finishGameInput !== "cookillers2026"}
                >
                  Figer !
                </button>
                <button
                  type="button"
                  className="btn-cartoon"
                  style={{ flex: 1, height: "44px", backgroundColor: "#4b5563" }}
                  onClick={() => setShowFinishGameModal(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
      </nav>

    </div>
  );
}
