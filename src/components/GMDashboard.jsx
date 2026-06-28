import React, { useState } from "react";
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
  const [securesPin, setSecuresPin] = useState("");

  // Pool de défis - Ajout / Édition
  const [showAddDefiForm, setShowAddDefiForm] = useState(false);
  const [editingDefi, setEditingDefi] = useState(null);
  const [defiTitle, setDefiTitle] = useState("");
  const [defiDesc, setDefiDesc] = useState("");
  const [defiReward, setDefiReward] = useState(100);
  const [defiDamage, setDefiDamage] = useState(1.5);
  const [defiZombieOnly, setDefiZombieOnly] = useState(false);
  const [defiType, setDefiType] = useState("mission"); // 'mission', 'fountain_action', 'fountain_truth'

  // Filtrer les événements de l'historique en attente (pending)
  const pendingHits = gameState.history.filter(h => h.status === "pending" && h.type === "hit_declared");
  const pendingCounters = gameState.history.filter(h => h.status === "pending" && h.type === "counter_attack_pending");
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

  // Action : Terminer la chasse
  const handleFinishGame = async () => {
    if (confirm("Voulez-vous vraiment clore la chasse aux cookies ? Cela fige le classement final et décerne les trophées.")) {
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
      }
    }
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
        showToast("Défi mis à jour ! 📖");
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
        showToast("Nouveau défi injecté dans la pool ! 📖");
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
        if (currentPlayer.isZombie && !finalZombie) {
          // RÉSURRECTION : Le joueur passe de zombie à vivant
          // 1. Trouver un joueur actif vivant au hasard pour s'insérer dans sa cible
          const { data: activePlayers, error: fetchErr } = await supabase
            .from("players")
            .select("name, target")
            .eq("game_code", gameCode)
            .eq("is_zombie", false)
            .eq("is_frozen", false)
            .neq("name", editingPlayer);

          if (!fetchErr && activePlayers && activePlayers.length > 0) {
            const randomPlayer = activePlayers[Math.floor(Math.random() * activePlayers.length)];
            const oldTarget = randomPlayer.target;

            // randomPlayer cible le joueur ressuscité
            await supabase
              .from("players")
              .update({ target: editingPlayer })
              .eq("game_code", gameCode)
              .eq("name", randomPlayer.name);

            // Le joueur ressuscité cible l'ancienne cible de randomPlayer et reçoit un défi
            const { data: poolActions } = await supabase
              .from("action_pools")
              .select("id")
              .eq("game_code", gameCode)
              .eq("is_zombie_only", false);

            const randomActionId = poolActions && poolActions.length > 0 
              ? poolActions[Math.floor(Math.random() * poolActions.length)].id 
              : null;

            const { error: upErr } = await supabase
              .from("players")
              .update({
                score: editScore,
                lives: finalLives,
                is_zombie: false,
                target: oldTarget,
                action_id: randomActionId
              })
              .eq("game_code", gameCode)
              .eq("name", editingPlayer);

            if (upErr) throw upErr;
          } else {
            // Se cible lui-même s'il est tout seul
            const { error: upErr } = await supabase
              .from("players")
              .update({
                score: editScore,
                lives: finalLives,
                is_zombie: false,
                target: editingPlayer
              })
              .eq("game_code", gameCode)
              .eq("name", editingPlayer);

            if (upErr) throw upErr;
          }
        } else if (!currentPlayer.isZombie && finalZombie) {
          // DÉCÈS : Le joueur vivant passe zombie
          // Trouver le tueur qui le ciblait
          const { data: killer } = await supabase
            .from("players")
            .select("name")
            .eq("game_code", gameCode)
            .eq("target", editingPlayer)
            .maybeSingle();

          if (killer) {
            // Refermer la boucle : le tueur cible la cible du mort
            await supabase
              .from("players")
              .update({ target: currentPlayer.target })
              .eq("game_code", gameCode)
              .eq("name", killer.name);
          }

          const { error: upErr } = await supabase
            .from("players")
            .update({
              score: editScore,
              lives: 0.0,
              is_zombie: true,
              target: null,
              action_id: null
            })
            .eq("game_code", gameCode)
            .eq("name", editingPlayer);

          if (upErr) throw upErr;
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
        <div className="card-cartoon glow-red" style={{ margin: "10px" }}>
          <h2 style={{ color: "var(--color-red)", textAlign: "center", width: "100%", marginBottom: "1rem" }}>
            Arbitrage des Requêtes 🛡️
          </h2>

          {pendingHits.length === 0 && pendingCounters.length === 0 && (
            <p style={{ textAlign: "center", color: "#9ca3af", fontStyle: "italic", padding: "20px 0" }}>
              Aucune demande de neutralisation ou accusation à trancher pour le moment. Le camping dort.
            </p>
          )}

          {/* Assassinats / Morsures à trancher */}
          {pendingHits.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "0.9rem", color: "var(--color-purple)", borderBottom: "2px solid var(--border-color)", paddingBottom: "4px" }}>
                Demandes de Validation ({pendingHits.length})
              </h3>
              {pendingHits.map((h) => {
                const zombieAttack = gameState.players.find(p => p.name === h.playerName)?.isZombie;
                return (
                  <div key={h.id} style={{ border: "2px solid #000", borderRadius: "12px", padding: "10px", backgroundColor: "#1e172e", boxShadow: "2px 2px 0 #000" }}>
                    <p style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>
                      {zombieAttack ? (
                        <>
                          <strong>🧟 [Zombie] {h.playerName}</strong> déclare avoir mordu <strong>{h.targetName}</strong> !
                        </>
                      ) : (
                        <>
                          <strong>⚔️ {h.playerName}</strong> déclare avoir neutralisé <strong>{h.targetName}</strong> !
                        </>
                      )}
                      <br/>
                      Défi : <em>« {h.actionTitle} »</em>
                    </p>
                    {h.hasPhotoProof && (
                      <span style={{ fontSize: "0.75rem", color: "var(--color-cyan)" }}>📸 Preuve photo jointe</span>
                    )}
                    <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                      <button
                        type="button"
                        className="btn-cartoon btn-green"
                        style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem" }}
                        onClick={() => zombieAttack ? approveZombieBite(h.id) : approveHit(h.id)}
                      >
                        Accepter
                      </button>
                      <button
                        type="button"
                        className="btn-cartoon btn-red"
                        style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem" }}
                        onClick={() => rejectHit(h.id)}
                      >
                        Rejeter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Contre-attaques à trancher */}
          {pendingCounters.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3 style={{ fontSize: "0.9rem", color: "var(--color-red)", borderBottom: "2px solid var(--border-color)", paddingBottom: "4px" }}>
                Dénonciations / Accusations ({pendingCounters.length})
              </h3>
              {pendingCounters.map((c) => (
                <div key={c.id} style={{ border: "2px solid #000", borderRadius: "12px", padding: "10px", backgroundColor: "#1e172e", boxShadow: "2px 2px 0 #000" }}>
                  <p style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>
                    <strong>{c.playerName}</strong> accuse <strong>{c.targetName}</strong> de vouloir lui faire accomplir :<br/>
                    <em>« {c.actionTitle} »</em>
                  </p>
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button
                      type="button"
                      className="btn-cartoon btn-green"
                      style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem" }}
                      onClick={() => resolveCounterAttack(c.id, true)}
                    >
                      Verdict CORRECT
                    </button>
                    <button
                      type="button"
                      className="btn-cartoon btn-red"
                      style={{ flex: 1, padding: "0.4rem", fontSize: "0.8rem" }}
                      onClick={() => resolveCounterAttack(c.id, false)}
                    >
                      Fausse Accusation
                    </button>
                  </div>
                </div>
              ))}
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
                  const extractedType = parts.length > 1 ? parts[0] : "mission";
                  const cleanDesc = parts.length > 1 ? parts.slice(1).join("|") : s.photoProof;

                  let typeLabel = "🎯 Mission";
                  let typeColor = "var(--color-purple)";
                  if (extractedType === "fountain_action") {
                    typeLabel = "⛲ Action Source";
                    typeColor = "var(--color-cyan)";
                  } else if (extractedType === "fountain_truth") {
                    typeLabel = "⛲ Vérité Source";
                    typeColor = "#10b981";
                  }

                  return (
                    <div key={s.id} style={{ border: "1px solid rgba(168, 85, 247, 0.4)", borderRadius: "8px", padding: "8px", backgroundColor: "#100a1c" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                          Proposé par : <strong>{s.playerName}</strong>
                        </span>
                        <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.05)", border: `1px solid ${typeColor}`, color: typeColor, fontWeight: "bold" }}>
                          {typeLabel}
                        </span>
                      </div>
                      <div style={{ fontWeight: "bold", fontSize: "0.9rem", color: "#fff" }}>{s.actionTitle}</div>
                      <div style={{ fontSize: "0.8rem", color: "#d1d5db", marginTop: "2px" }}>{cleanDesc}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-cyan)" }}>
                          {extractedType === "mission" ? (
                            <>🪙 +{s.scoreReward} | ❤️ -{s.damagePenalty}</>
                          ) : (
                            <>Soin : +{s.damagePenalty} ❤️</>
                          )}
                        </span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn-cartoon btn-green"
                            style={{ padding: "2px 8px", fontSize: "0.7rem" }}
                            onClick={async () => {
                              // Valider : insérer dans action_pools
                              const { error: insErr } = await supabase.from("action_pools").insert([
                                {
                                  game_code: gameCode,
                                  title: s.actionTitle,
                                  description: cleanDesc,
                                  score_reward: extractedType === "mission" ? s.scoreReward : 0,
                                  damage_penalty: s.damagePenalty,
                                  is_zombie_only: false,
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
                            style={{ padding: "2px 8px", fontSize: "0.7rem" }}
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
                    onClick={() => { setDefiType("mission"); setDefiReward(100); setDefiDamage(1.5); }}
                  >
                    Mission 🎯
                  </button>
                  <button
                    type="button"
                    style={{ flex: 1, padding: "6px", fontSize: "0.7rem", border: "2px solid #000", borderRadius: "8px", backgroundColor: defiType === "fountain_action" ? "var(--color-cyan)" : "#100e1f", color: defiType === "fountain_action" ? "#000" : "#fff", fontWeight: "bold", cursor: "pointer" }}
                    onClick={() => { setDefiType("fountain_action"); setDefiReward(0); setDefiDamage(0.5); }}
                  >
                    Action ⛲
                  </button>
                  <button
                    type="button"
                    style={{ flex: 1, padding: "6px", fontSize: "0.7rem", border: "2px solid #000", borderRadius: "8px", backgroundColor: defiType === "fountain_truth" ? "var(--color-cyan)" : "#100e1f", color: defiType === "fountain_truth" ? "#000" : "#fff", fontWeight: "bold", cursor: "pointer" }}
                    onClick={() => { setDefiType("fountain_truth"); setDefiReward(0); setDefiDamage(0.5); }}
                  >
                    Vérité ⛲
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
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
                      <span style={{ position: "absolute", left: "8px", fontSize: "1rem", pointerEvents: "none" }}>🪙</span>
                      <input
                        type="number"
                        value={defiReward}
                        onChange={(e) => setDefiReward(Number(e.target.value))}
                        style={{ width: "100%", padding: "6px 6px 6px 30px", backgroundColor: "#100e1f", border: "2px solid #000", borderRadius: "6px", color: "#fff" }}
                      />
                    </div>
                    <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
                      <span style={{ position: "absolute", left: "8px", fontSize: "1rem", pointerEvents: "none" }}>❤️</span>
                      <input
                        type="number"
                        step="0.5"
                        value={defiDamage}
                        onChange={(e) => setDefiDamage(Number(e.target.value))}
                        style={{ width: "100%", padding: "6px 6px 6px 30px", backgroundColor: "#100e1f", border: "2px solid #000", borderRadius: "6px", color: "#fff" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--color-cyan)", fontWeight: "bold" }}>
                      <span>Difficulté / Soin apporté :</span>
                      <span>
                        {defiDamage === 0.5 ? "Tier I : Jus de Chaussette (+0.5 ❤️)" : 
                         defiDamage === 1.5 ? "Tier II : Élixir du Barman (+1.5 ❤️)" : 
                         "Tier III : Larmes de VIP (+3.0 ❤️)"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="1"
                      value={defiDamage === 0.5 ? 1 : defiDamage === 1.5 ? 2 : 3}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val === 1) setDefiDamage(0.5);
                        else if (val === 2) setDefiDamage(1.5);
                        else setDefiDamage(3.0);
                      }}
                      style={{ width: "100%", accentColor: "var(--color-cyan)", cursor: "pointer" }}
                    />
                  </div>
                )}

                {defiType === "mission" && (
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={defiZombieOnly}
                      onChange={(e) => setDefiZombieOnly(e.target.checked)}
                    /> Defi Zombie uniquement 🧟
                  </label>
                )}
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button type="submit" className="btn-cartoon btn-green" style={{ flex: 1, padding: "0.5rem" }}>
                    {editingDefi ? "Sauvegarder" : "Injecter"}
                  </button>
                  {editingDefi && (
                    <button
                      type="button"
                      className="btn-cartoon btn-red"
                      style={{ flex: 1, padding: "0.5rem" }}
                      onClick={() => {
                        setEditingDefi(null);
                        setDefiTitle("");
                        setDefiDesc("");
                        setDefiReward(100);
                        setDefiDamage(1.5);
                        setDefiZombieOnly(false);
                        setDefiType("mission");
                        setShowAddDefiForm(false);
                      }}
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* Liste défis GM */}
          <h3 style={{ fontSize: "0.85rem", color: "#d1d5db", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "4px", marginBottom: "8px", textAlign: "left" }}>
            Défis du GM ({gameState.actionPool.filter(a => !a.createdByPlayer).length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1.5rem" }}>
            {gameState.actionPool.filter(a => !a.createdByPlayer).map((a) => (
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
                  <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{a.title} {a.isZombieOnly && "🧟"}</div>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontStyle: "italic" }}>{a.description}</div>
                  <div style={{ fontSize: "0.7rem", fontWeight: "bold", color: "#fbbf24", marginTop: "2px" }}>
                    +{a.scoreReward} 🪙 | -{a.damagePenalty} ❤️
                  </div>
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
            ))}
          </div>

          {/* Liste défis proposés par les joueurs (validés) */}
          {gameState.actionPool.filter(a => a.createdByPlayer).length > 0 && (
            <>
              <h3 style={{ fontSize: "0.85rem", color: "var(--color-cyan)", borderBottom: "1px solid rgba(0,255,255,0.2)", paddingBottom: "4px", marginBottom: "8px", textAlign: "left" }}>
                Propositions validées ({gameState.actionPool.filter(a => a.createdByPlayer).length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {gameState.actionPool.filter(a => a.createdByPlayer).map((a) => (
                  <div
                    key={a.id}
                    style={{
                      border: "2px solid rgba(0,255,255,0.3)",
                      borderRadius: "12px",
                      padding: "8px 10px",
                      backgroundColor: "rgba(0,255,255,0.03)",
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
                      <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>{a.title} {a.isZombieOnly && "🧟"}</div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontStyle: "italic" }}>{a.description}</div>
                      <div style={{ fontSize: "0.7rem", fontWeight: "bold", color: "#fbbf24", marginTop: "2px" }}>
                        +{a.scoreReward} 🪙 | -{a.damagePenalty} ❤️
                      </div>
                      <span style={{ fontSize: "0.65rem", color: "var(--color-cyan)" }}>Proposé par {a.createdByPlayer}</span>
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
                ))}
              </div>
            </>
          )}
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

          {editingPlayer ? (
            <div style={{ border: "2px solid var(--color-purple)", padding: "12px", borderRadius: "12px", backgroundColor: "#1d1933", textAlign: "left" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "8px", transform: "none", textShadow: "none" }}>Modifier {editingPlayer}</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.75rem", color: "#fbbf24" }}>🪙 :</label>
                    <input
                      type="number"
                      value={editScore}
                      onChange={(e) => setEditScore(Number(e.target.value))}
                      style={{ width: "100%", padding: "6px", backgroundColor: "#100e1f", border: "2px solid #000", borderRadius: "6px", color: "#fff" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--color-red)" }}>❤️ :</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                      <button 
                        type="button" 
                        className="btn-cartoon" 
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }} 
                        onClick={() => setEditLives(prev => Math.max(0.0, prev - 0.5))}
                      >
                        -
                      </button>
                      <span style={{ fontFamily: "var(--font-title)", minWidth: "28px", textAlign: "center", display: "inline-block" }}>
                        {editLives}
                      </span>
                      <button 
                        type="button" 
                        className="btn-cartoon" 
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }} 
                        onClick={() => setEditLives(prev => Math.min(7.0, prev + 0.5))}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "20px", margin: "4px 0" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editZombie}
                      onChange={(e) => setEditZombie(e.target.checked)}
                    /> Zombie 🧟
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editFrozen}
                      onChange={(e) => setEditFrozen(e.target.checked)}
                    /> Exfiltré (Gelé) ❄️
                  </label>
                </div>

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

                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button type="button" className="btn-cartoon btn-green" style={{ flex: 1, padding: "0.5rem" }} onClick={handleGodSave}>Sauver</button>
                  <button type="button" className="btn-cartoon btn-red" style={{ flex: 1, padding: "0.5rem" }} onClick={() => handleRemovePlayer(editingPlayer)}>Bannir</button>
                </div>
                <button type="button" className="btn-cartoon" style={{ padding: "0.4rem", backgroundColor: "#4b5563" }} onClick={() => setEditingPlayer(null)}>Annuler</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {gameState.players.map((p) => (
                <div
                  key={p.name}
                  onClick={() => {
                    setEditingPlayer(p.name);
                    setEditScore(p.score);
                    setEditLives(p.lives);
                    setEditZombie(p.isZombie);
                    setEditFrozen(p.isFrozen);
                    setSecuresPin("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  style={{
                    border: "2px solid #000",
                    borderRadius: "12px",
                    padding: "8px 12px",
                    backgroundColor: "rgba(255,255,255,0.02)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: "bold" }}>
                      {p.name} {p.isZombie && "🧟"} {p.isFrozen && "❄️"}
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                      Cible : {p.target || "Aucune"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", fontSize: "0.9rem" }}>
                    <span style={{ color: "#fbbf24" }}>{p.score} 🪙</span>
                    <span>{p.isZombie ? "🧟" : `${p.lives} ❤️`}</span>
                  </div>
                </div>
              ))}
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
      </nav>

    </div>
  );
}
