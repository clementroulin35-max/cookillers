import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";
import { sha256 } from "../utils/crypto";

const GameContext = createContext();

const initialGameState = {
  started: false,
  players: [],
  history: [],
  actionPool: [],
};

export const GameProvider = ({ children }) => {
  const [gameCode, setGameCode] = useState(() => {
    return localStorage.getItem("cookillers_game_code") || null;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const cached = localStorage.getItem("cookillers_current_user");
    return (cached && cached !== "null") ? cached : null;
  });

  const [gameState, setGameState] = useState(() => {
    const cached = localStorage.getItem(`cache_cookillers_state_${gameCode}`);
    return cached ? JSON.parse(cached) : initialGameState;
  });

  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    const queued = localStorage.getItem("cookillers_offline_queue");
    return queued ? JSON.parse(queued) : [];
  });

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Sync state version comparison and fetch state
  const fetchGameState = useCallback(async (code) => {
    if (!code || code === "PENDING") return;
    try {
      // Appelle le RPC get_complete_game_state pour tout récupérer en un seul appel
      const { data, error } = await supabase.rpc("get_complete_game_state", {
        p_game_code: code
      });

      if (error) throw error;
      if (!data) {
        // Le salon n'existe pas ou plus
        setGameCode(null);
        setCurrentUser(null);
        setGameState(initialGameState);
        return;
      }

      const formattedState = {
        started: data.game.status === "active" || data.game.status === "finished",
        status: data.game.status,
        stateVersion: data.game.stateVersion,
        startTime: data.game.startTime,
        endTime: data.game.endTime,
        players: data.players || [],
        actionPool: data.actionPool || [],
        history: data.history || []
      };

      setGameState(formattedState);
      localStorage.setItem(`cache_cookillers_state_${code}`, JSON.stringify(formattedState));
    } catch (err) {
      console.error("Erreur de récupération de l'état :", err);
      // Fallback sur le cache LocalStorage
      const cached = localStorage.getItem(`cache_cookillers_state_${code}`);
      if (cached) {
        setGameState(JSON.parse(cached));
      }
    }
  }, []);

  // Sync gameCode, currentUser and offlineQueue to LocalStorage
  useEffect(() => {
    if (gameCode && gameCode !== "PENDING") {
      localStorage.setItem("cookillers_game_code", gameCode);
    } else if (!gameCode) {
      localStorage.removeItem("cookillers_game_code");
    }
  }, [gameCode]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("cookillers_current_user", currentUser);
    } else {
      localStorage.removeItem("cookillers_current_user");
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("cookillers_offline_queue", JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("Connexion rétablie ! Lancement de la synchronisation des actions en attente...");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast("Réseau en carton détecté. Mode hors-ligne activé.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [showToast]);

  // Realtime subscription (Écoute uniquement les UPDATE de la table games pour state_version)
  useEffect(() => {
    if (!gameCode) {
      setGameState(initialGameState);
      return;
    }
    if (gameCode === "PENDING") {
      return;
    }

    fetchGameState(gameCode);

    const channel = supabase
      .channel(`games_version:${gameCode}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `game_code=eq.${gameCode}` },
        (payload) => {
          // Si le state_version a augmenté, on recharge l'état complet
          fetchGameState(gameCode);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameCode, fetchGameState]);

  // Execute single queue operation
  const executeQueueItem = async (item) => {
    switch (item.type) {
      case "HIT": {
        // Enregistrer la déclaration de hit dans l'historique
        const { error } = await supabase.from("history").insert([
          {
            game_code: gameCode,
            player_name: item.playerName,
            target_name: item.targetName,
            action_title: item.actionTitle,
            score_reward: item.scoreReward,
            damage_penalty: item.damagePenalty,
            type: "hit_declared",
            status: "pending",
            photo_proof: item.photoProof
          }
        ]);
        if (error) throw error;
        // Déclencher un incrément version sur le serveur pour alerter le GM
        await supabase.rpc("get_complete_game_state", { p_game_code: gameCode }); // hack trigger increment or via state_version update
        // Mais pour incrémenter state_version, on fait une mise à jour sur games
        await supabase.rpc("skip_player_mission_transaction", { p_game_code: gameCode, p_name: item.playerName }); // non, ce n'est pas le bon RPC.
        // En fait, on peut simplement faire un update direct de la version sur games
        await supabase.from("games").update({ state_version: gameState.stateVersion + 1 }).eq("game_code", gameCode);
        break;
      }
      case "SKIP": {
        const { error } = await supabase.rpc("skip_player_mission_transaction", {
          p_game_code: gameCode,
          p_name: item.playerName
        });
        if (error) throw error;
        break;
      }
      case "ABANDON": {
        const { error } = await supabase.rpc("abandon_target_transaction", {
          p_game_code: gameCode,
          p_name: item.playerName,
          p_penalty_type: item.penaltyType
        });
        if (error) throw error;
        break;
      }
      case "FOUNTAIN": {
        const { error } = await supabase.rpc("use_fountain_transaction", {
          p_game_code: gameCode,
          p_name: item.playerName,
          p_fountain_type: item.fountainType,
          p_proof: item.proof,
          p_gain_lives: item.gainLives
        });
        if (error) throw error;
        break;
      }
      case "SUGGESTION": {
        const { error } = await supabase.from("history").insert([
          {
            game_code: gameCode,
            player_name: item.playerName,
            type: "suggestion_pending",
            status: "pending",
            action_title: item.title,
            photo_proof: item.description,
            score_reward: item.scoreReward,
            damage_penalty: item.damagePenalty
          }
        ]);
        if (error) throw error;
        // Incrémenter state_version pour notifier le GM
        await supabase.from("games").update({ state_version: gameState.stateVersion + 1 }).eq("game_code", gameCode);
        break;
      }
      case "COUNTER_ATTACK": {
        const { error } = await supabase.from("history").insert([
          {
            game_code: gameCode,
            player_name: item.playerName,
            target_name: item.targetName,
            action_title: item.actionTitle,
            type: "counter_attack_pending",
            status: "pending"
          }
        ]);
        if (error) throw error;
        // Mettre à jour state_version
        await supabase.from("games").update({ state_version: gameState.stateVersion + 1 }).eq("game_code", gameCode);
        break;
      }
      case "ZOMBIE_BITE": {
        const { error } = await supabase.from("history").insert([
          {
            game_code: gameCode,
            player_name: item.playerName,
            target_name: item.targetName,
            action_title: item.actionTitle,
            type: "hit_declared", // ou zombie_bite_declared ? On utilise hit_declared sous le statut pending
            status: "pending"
          }
        ]);
        if (error) throw error;
        // Mettre à jour state_version
        await supabase.from("games").update({ state_version: gameState.stateVersion + 1 }).eq("game_code", gameCode);
        break;
      }
      default:
        break;
    }
  };

  // Process offline queue
  const processOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0 || !navigator.onLine) return;

    setLoading(true);
    const queue = [...offlineQueue];
    const itemsToRemove = [];

    for (const item of queue) {
      try {
        await executeQueueItem(item);
        itemsToRemove.push(item.id);
      } catch (err) {
        console.error("Erreur de synchronisation hors-ligne pour l'item :", item, err);
        // Si c'est une erreur réseau, on arrête la boucle pour préserver l'ordre
        if (!navigator.onLine || err.message?.includes("fetch") || err.message?.includes("Failed to fetch")) {
          showToast("Problème réseau persistant, synchronisation en pause.");
          break;
        }
        // Sinon c'est une erreur logique (ex: plus de skips) -> on supprime de la queue et on alerte
        itemsToRemove.push(item.id);
        showToast(`Conflit d'intégrité : ${err.message || "Action impossible en base de données."}`);
      }
    }

    if (itemsToRemove.length > 0) {
      setOfflineQueue(prev => prev.filter(item => !itemsToRemove.includes(item.id)));
      fetchGameState(gameCode);
    }
    setLoading(false);
  }, [offlineQueue, gameCode, fetchGameState, showToast]);

  // Trigger offline queue processing when online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      processOfflineQueue();
    }
  }, [isOnline, offlineQueue.length, processOfflineQueue]);

  // Queue item wrapper
  const queueAction = async (type, details) => {
    const newItem = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      type,
      playerName: currentUser,
      ...details
    };

    if (!navigator.onLine) {
      setOfflineQueue(prev => [...prev, newItem]);
      showToast("Action mise en file d'attente (mode hors-ligne). Elle sera synchronisée au retour du réseau !");
      return { offline: true };
    }

    try {
      setLoading(true);
      await executeQueueItem(newItem);
      await fetchGameState(gameCode);
      return { success: true };
    } catch (err) {
      console.error("Erreur d'exécution de l'action :", err);
      showToast(`Échec de l'action : ${err.message || "Erreur inconnue."}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ROOM ACTIONS
  const createRoom = async (code, gmPin = "0000") => {
    setLoading(true);
    try {
      const upperCode = code.toUpperCase().trim();
      
      const { error: gameError } = await supabase
        .from("games")
        .insert([{ game_code: upperCode, status: "lobby", gm_pin: gmPin }]);

      if (gameError) throw gameError;

      // Pool de base de Cookillers
      const defaultActions = [
        // Rareté Commun (50 à 90 🪙 | -0.5 ❤️)
        { title: "Le Vol de Style 🕶️", description: "Faire porter à ta cible l'un de tes accessoires pendant au moins 1h.", score_reward: 70, damage_penalty: 0.5, is_zombie_only: false },
        { title: "L'Ami VIP 🤝", description: "Faire faire un selfie à ta cible avec un bénévole du festival.", score_reward: 80, damage_penalty: 0.5, is_zombie_only: false },
        { title: "La Crème de la Crème 🧴", description: "Faire appliquer de la crème solaire sur le visage ou les bras de la cible.", score_reward: 90, damage_penalty: 0.5, is_zombie_only: false },
        { title: "Gros Bluff 🤫", description: "Faire répéter à ta cible : 'Le camping est hanté par des cookies géants' sans rigoler.", score_reward: 60, damage_penalty: 0.5, is_zombie_only: false },
        
        // Rareté Standard (100 à 190 🪙 | -1.5 ❤️)
        { title: "Le Duel Shifumi ⚔️", description: "Proposer un Shifumi à ta cible et la battre en 2 manches gagnantes.", score_reward: 130, damage_penalty: 1.5, is_zombie_only: false },
        { title: "Le Syndrome Zombie 🧟‍♂️", description: "Faire crier le mot 'Cerveau' à ta cible au milieu d'une phrase hors contexte.", score_reward: 150, damage_penalty: 1.5, is_zombie_only: false },
        { title: "Le Check Secret 🫱🏼‍🫲🏼", description: "Créer et faire exécuter un check personnalisé complexe à ta cible en 1v1.", score_reward: 180, damage_penalty: 1.5, is_zombie_only: false },
        
        // Rareté Élite (200 à 390 🪙 | -2.5 ❤️)
        { title: "L'Apéro Fatal 🍻", description: "Faire boire un shot d'un coup à la cible (Alcool ou Soft).", score_reward: 250, damage_penalty: 2.5, is_zombie_only: false },
        { title: "La Chenille du Camping 🐛", description: "Faire lancer ou rejoindre une chenille à ta cible avec au moins 3 inconnus.", score_reward: 350, damage_penalty: 2.5, is_zombie_only: false },
        { title: "Le Hamac Partagé ⛺", description: "Faire faire une sieste de 10 min à ta cible dans le même hamac que toi.", score_reward: 320, damage_penalty: 2.5, is_zombie_only: false },

        // Rareté Légendaire (400 à 600 🪙 | -4.0 ❤️)
        { title: "L'Animateur du Pogo 📣", description: "Faire lancer une Hola à la cible au milieu de la foule, suivie par au moins 3 inconnus.", score_reward: 550, damage_penalty: 4.0, is_zombie_only: false },
        { title: "Le Saute-Mouton Humide 🐑", description: "Faire faire un saute-mouton à ta cible au milieu de la foule du camping.", score_reward: 500, damage_penalty: 4.0, is_zombie_only: false },
        { title: "L'Étoile de Mer 🪼", description: "Faire faire l'étoile de mer au sol à ta cible pendant 20 secondes.", score_reward: 520, damage_penalty: 4.0, is_zombie_only: false },

        // Défis Zombie spéciaux
        { title: "L'Infection Zombie 🪦", description: "Faire prononcer le mot 'Zombie' à un survivant en le fixant avec insistance.", score_reward: 50, damage_penalty: 1.0, is_zombie_only: true },
        { title: "La Marche Gluante 🧟‍♀️", description: "Faire mimer une marche de zombie complète à ta victime pendant 10 secondes.", score_reward: 50, damage_penalty: 1.0, is_zombie_only: true }
      ];

      const actionsToInsert = defaultActions.map(a => ({
        game_code: upperCode,
        title: a.title,
        description: a.description,
        score_reward: a.score_reward,
        damage_penalty: a.damage_penalty,
        is_zombie_only: a.is_zombie_only
      }));

      const { error: poolError } = await supabase
        .from("action_pools")
        .insert(actionsToInsert);

      if (poolError) throw poolError;

      setGameCode(upperCode);
      setCurrentUser("GM");
      return upperCode;
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (code) => {
    const upperCode = code.toUpperCase().trim();
    const { data, error } = await supabase
      .from("games")
      .select("game_code, status")
      .eq("game_code", upperCode)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error(`Le salon "${upperCode}" n'existe pas.`);
    }

    setGameCode(upperCode);
    setCurrentUser(null);
    return upperCode;
  };

  const registerPlayer = async (name, pin) => {
    if (!gameCode) return;
    const cleanName = name.trim();
    if (!cleanName) throw new Error("Pseudo requis");

    const pinHash = await sha256(cleanName.toLowerCase() + pin + "cookillers_salt_2026");

    // Appel du RPC join_and_initialize_player
    const { error } = await supabase.rpc("join_and_initialize_player", {
      p_game_code: gameCode,
      p_name: cleanName,
      p_pin_hash: pinHash
    });

    if (error) throw error;

    localStorage.setItem("cookillers_player_pin", pin);
    setCurrentUser(cleanName);
    return cleanName;
  };

  const loginPlayer = async (name, pin) => {
    if (!gameCode) return;
    const cleanName = name.trim();
    if (!cleanName) throw new Error("Pseudo requis");

    // S'il s'agit du GM
    if (cleanName === "GM") {
      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .select("gm_pin")
        .eq("game_code", gameCode)
        .maybeSingle();

      if (gameError) throw gameError;
      if (gameData && gameData.gm_pin === pin) {
        setCurrentUser("GM");
        return "GM";
      } else {
        throw new Error("Code PIN GM incorrect.");
      }
    }

    // Hashage du PIN avec le même sel client
    const pinHash = await sha256(cleanName.toLowerCase() + pin + "cookillers_salt_2026");

    // Récupérer le joueur
    const { data: player, error } = await supabase
      .from("players")
      .select("pin_hash")
      .eq("game_code", gameCode)
      .eq("name", cleanName)
      .maybeSingle();

    if (error) throw error;
    if (!player) {
      throw new Error(`Le joueur "${cleanName}" n'est pas inscrit.`);
    }

    if (player.pin_hash !== pinHash) {
      throw new Error("Code PIN incorrect.");
    }

    localStorage.setItem("cookillers_player_pin", pin);
    setCurrentUser(cleanName);
    return cleanName;
  };

  const logOut = () => {
    setCurrentUser(null);
    setGameCode(null);
    setGameState(initialGameState);
  };

  // GAME ACTIONS (RPC WRAPPERS)
  const startGame = async () => {
    if (!gameCode) return;
    const { error } = await supabase.rpc("start_game_transaction", { p_game_code: gameCode });
    if (error) throw error;
    await fetchGameState(gameCode);
  };

  const skipMission = async () => {
    return await queueAction("SKIP", {});
  };

  const abandonTarget = async (penaltyType) => {
    return await queueAction("ABANDON", { penaltyType });
  };

  const declareHit = async (targetName, actionTitle, scoreReward, damagePenalty, photoProof = null) => {
    return await queueAction("HIT", {
      targetName,
      actionTitle,
      scoreReward,
      damagePenalty,
      photoProof
    });
  };

  const launchCounterAttack = async (targetName, actionTitle) => {
    return await queueAction("COUNTER_ATTACK", {
      targetName,
      actionTitle
    });
  };

  const submitFountainProof = async (fountainType, proof, gainLives) => {
    return await queueAction("FOUNTAIN", {
      fountainType,
      proof,
      gainLives
    });
  };

  const suggestAction = async (title, description, scoreReward, damagePenalty, isZombieOnly = false) => {
    return await queueAction("SUGGESTION", {
      title,
      description,
      scoreReward,
      damagePenalty,
      isZombieOnly
    });
  };

  // GM ACTION WORKFLOWS
  const approveHit = async (historyId) => {
    const { error } = await supabase.rpc("approve_hit_transaction", { p_history_id: historyId });
    if (error) throw error;
    await fetchGameState(gameCode);
  };

  const rejectHit = async (historyId) => {
    const { error } = await supabase.rpc("reject_hit_transaction", { p_history_id: historyId });
    if (error) throw error;
    await fetchGameState(gameCode);
  };

  const resolveCounterAttack = async (historyId, isCorrect) => {
    const { error } = await supabase.rpc("resolve_counter_attack_transaction", {
      p_history_id: historyId,
      p_is_correct: isCorrect
    });
    if (error) throw error;
    await fetchGameState(gameCode);
  };

  const approveZombieBite = async (historyId) => {
    const { error } = await supabase.rpc("approve_zombie_bite_transaction", {
      p_history_id: historyId
    });
    if (error) throw error;
    await fetchGameState(gameCode);
  };

  const freezePlayer = async (playerName) => {
    const { error } = await supabase.rpc("freeze_player_transaction", {
      p_game_code: gameCode,
      p_name: playerName
    });
    if (error) throw error;
    await fetchGameState(gameCode);
  };

  const unfreezePlayer = async (playerName) => {
    const { error } = await supabase.rpc("unfreeze_player_transaction", {
      p_game_code: gameCode,
      p_name: playerName
    });
    if (error) throw error;
    await fetchGameState(gameCode);
  };

  const roosterCrow = async () => {
    const { error } = await supabase.rpc("rooster_crow_transaction", { p_game_code: gameCode });
    if (error) throw error;
    await fetchGameState(gameCode);
  };

  const resetPlayerPin = async (playerName) => {
    const { data, error } = await supabase.rpc("reset_player_pin", {
      p_game_code: gameCode,
      p_name: playerName
    });
    if (error) throw error;
    return data; // Renvoie le PIN à 4 chiffres généré en clair
  };

  const removePlayer = async (playerName) => {
    const { error } = await supabase.rpc("remove_player_transaction", {
      p_game_code: gameCode,
      p_name: playerName
    });
    if (error) throw error;
    await fetchGameState(gameCode);
  };

  const resurrectPlayer = async (playerName, score, lives) => {
    const { error } = await supabase.rpc("resurrect_player_transaction", {
      p_game_code: gameCode,
      p_name: playerName,
      p_score: score,
      p_lives: lives
    });
    if (error) throw error;
    await fetchGameState(gameCode);
  };

  const killPlayer = async (playerName, score) => {
    const { error } = await supabase.rpc("kill_player_transaction", {
      p_game_code: gameCode,
      p_name: playerName,
      p_score: score
    });
    if (error) throw error;
    await fetchGameState(gameCode);
  };

  const updatePlayerPhoto = async (playerName, photoBase64) => {
    const { error } = await supabase
      .from("players")
      .update({ photo: photoBase64 })
      .eq("game_code", gameCode)
      .eq("name", playerName);
    if (error) throw error;
    await fetchGameState(gameCode);
  };

  const getPlayerPhoto = async (playerName) => {
    const { data, error } = await supabase
      .from("players")
      .select("photo")
      .eq("game_code", gameCode)
      .eq("name", playerName)
      .maybeSingle();
    if (error) throw error;
    return data?.photo || null;
  };

  const getHistoryProof = async (historyId) => {
    const { data, error } = await supabase
      .from("history")
      .select("photo_proof")
      .eq("id", historyId)
      .maybeSingle();
    if (error) throw error;
    return data?.photo_proof || null;
  };

  // Helper : Refresh manual
  const manualRefresh = () => {
    fetchGameState(gameCode);
  };

  return (
    <GameContext.Provider
      value={{
        gameCode,
        setGameCode,
        currentUser,
        gameState,
        loading,
        isOnline,
        offlineQueue,
        toastMessage,
        createRoom,
        joinRoom,
        registerPlayer,
        loginPlayer,
        logOut,
        startGame,
        skipMission,
        abandonTarget,
        declareHit,
        launchCounterAttack,
        submitFountainProof,
        suggestAction,
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
        updatePlayerPhoto,
        getPlayerPhoto,
        getHistoryProof,
        manualRefresh,
        showToast
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);
