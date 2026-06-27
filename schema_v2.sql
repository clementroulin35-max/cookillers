-- COOKILLERS V2 DATABASE SCHEMA & RPC FUNCTIONS

-- 1. Nettoyage et recréation des tables
DROP TABLE IF EXISTS public.history CASCADE;
DROP TABLE IF EXISTS public.action_pools CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;
DROP TABLE IF EXISTS public.games CASCADE;

-- 2. Création des tables

-- Table games
CREATE TABLE public.games (
    game_code varchar(10) PRIMARY KEY,
    status varchar(20) DEFAULT 'lobby' NOT NULL, -- 'lobby', 'active', 'finished'
    state_version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    gm_pin varchar(10) DEFAULT '0000' NOT NULL
);

-- Table players
CREATE TABLE public.players (
    game_code varchar(10) NOT NULL REFERENCES public.games(game_code) ON DELETE CASCADE,
    name varchar(50) NOT NULL,
    pin_hash varchar(64) NOT NULL,
    lives numeric(3,1) DEFAULT 7.0 NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    skips integer DEFAULT 2 NOT NULL,
    is_zombie boolean DEFAULT false NOT NULL,
    target varchar(50),
    action_id integer,
    photo text, -- Photo de profil Base64 (compression client < 100ko)
    is_frozen boolean DEFAULT false NOT NULL,
    
    -- États de la Source de Vie (Fontaine)
    fountain_uses_today integer DEFAULT 0 NOT NULL,
    fountain_refreshes_today integer DEFAULT 3 NOT NULL,
    fountain_total_uses integer DEFAULT 0 NOT NULL,
    fountain_active_type varchar(20),
    fountain_active_title varchar(255),
    fountain_active_description text,
    
    -- Statistiques pour Trophées V2
    stat_kills_count integer DEFAULT 0 NOT NULL,
    stat_failed_counterattacks integer DEFAULT 0 NOT NULL,
    stat_successful_counterattacks integer DEFAULT 0 NOT NULL,
    stat_skips_missions integer DEFAULT 0 NOT NULL,
    stat_skips_fountain integer DEFAULT 0 NOT NULL,
    stat_abandon_count integer DEFAULT 0 NOT NULL,
    stat_fountain_uses integer DEFAULT 0 NOT NULL,
    stat_evaded_hits integer DEFAULT 0 NOT NULL,
    stat_zombie_date timestamp with time zone,
    
    PRIMARY KEY (game_code, name)
);

-- Table action_pools
CREATE TABLE public.action_pools (
    id serial PRIMARY KEY,
    game_code varchar(10) REFERENCES public.games(game_code) ON DELETE CASCADE,
    title varchar(255) NOT NULL,
    description text NOT NULL,
    score_reward integer NOT NULL,
    damage_penalty numeric(3,1) NOT NULL,
    is_zombie_only boolean DEFAULT false NOT NULL,
    created_by_player varchar(50)
);

-- Table history
CREATE TABLE public.history (
    id bigserial PRIMARY KEY,
    game_code varchar(10) NOT NULL REFERENCES public.games(game_code) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    player_name varchar(50) NOT NULL,
    type varchar(30) NOT NULL, -- 'hit_declared', 'hit_approved', 'hit_rejected', 'counter_attack_pending', 'counter_attack_correct', 'counter_attack_incorrect', 'skip_mission', 'fountain_use', 'zombie_bite', 'player_frozen', 'player_unfrozen', 'rooster_crow', 'abandon_target'
    target_name varchar(50),
    action_title varchar(255),
    score_reward integer DEFAULT 0 NOT NULL,
    damage_penalty numeric(3,1) DEFAULT 0.0 NOT NULL,
    status varchar(20) DEFAULT 'completed' NOT NULL, -- 'pending', 'completed', 'rejected'
    photo_proof text
);

-- 3. Activation de Row Level Security (RLS)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- 4. Définition des Politiques de Sécurité (RLS)

CREATE POLICY "Allow public select on games" ON public.games FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public select on players" ON public.players FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public select on action_pools" ON public.action_pools FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public select on history" ON public.history FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow player registration" ON public.players FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow player self updates" ON public.players FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow player suggest action" ON public.action_pools FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow player insert history" ON public.history FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow GM full access games" ON public.games FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow GM full access players" ON public.players FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow GM full access action_pools" ON public.action_pools FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow GM full access history" ON public.history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- 5. FONCTIONS PL/pgSQL RPC SÉCURISÉES (SECURITY DEFINER)

-- RPC 1 : Récupérer l'état complet du jeu de manière optimisée
CREATE OR REPLACE FUNCTION public.get_complete_game_state(p_game_code text)
RETURNS json
SECURITY DEFINER
AS $$
DECLARE
    v_game record;
    v_players json;
    v_actions json;
    v_history json;
BEGIN
    SELECT status, state_version, start_time, end_time, gm_pin INTO v_game
    FROM public.games
    WHERE game_code = p_game_code;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT json_agg(json_build_object(
        'name', name,
        'lives', lives,
        'score', score,
        'skips', skips,
        'isZombie', is_zombie,
        'target', target,
        'actionId', action_id,
        'isFrozen', is_frozen,
        'fountainUsesToday', fountain_uses_today,
        'fountainRefreshesToday', fountain_refreshes_today,
        'fountainTotalUses', fountain_total_uses,
        'fountainActiveType', fountain_active_type,
        'fountainActiveTitle', fountain_active_title,
        'fountainActiveDescription', fountain_active_description,
        'hasPhoto', (photo IS NOT NULL AND photo != ''),
        'statKillsCount', stat_kills_count,
        'statFailedCounterattacks', stat_failed_counterattacks,
        'statSuccessfulCounterattacks', stat_successful_counterattacks,
        'statSkipsMissions', stat_skips_missions,
        'statSkipsFountain', stat_skips_fountain,
        'statAbandonCount', stat_abandon_count,
        'statFountainUses', stat_fountain_uses,
        'statEvadedHits', stat_evaded_hits,
        'statZombieDate', stat_zombie_date
    )) INTO v_players
    FROM public.players
    WHERE game_code = p_game_code;

    SELECT json_agg(json_build_object(
        'id', id,
        'title', title,
        'description', description,
        'scoreReward', score_reward,
        'damagePenalty', damage_penalty,
        'isZombieOnly', is_zombie_only,
        'createdByPlayer', created_by_player
    )) INTO v_actions
    FROM public.action_pools
    WHERE game_code = p_game_code;

    SELECT json_agg(json_build_object(
        'id', id,
        'createdAt', created_at,
        'playerName', player_name,
        'type', type,
        'targetName', target_name,
        'actionTitle', action_title,
        'scoreReward', score_reward,
        'damagePenalty', damage_penalty,
        'status', status,
        'hasPhotoProof', (photo_proof IS NOT NULL AND photo_proof != '')
    ) ORDER BY created_at DESC) INTO v_history
    FROM public.history
    WHERE game_code = p_game_code
    LIMIT 50;

    RETURN json_build_object(
        'game', json_build_object(
            'gameCode', p_game_code,
            'status', v_game.status,
            'stateVersion', v_game.state_version,
            'startTime', v_game.start_time,
            'endTime', v_game.end_time
        ),
        'players', COALESCE(v_players, '[]'::json),
        'actionPool', COALESCE(v_actions, '[]'::json),
        'history', COALESCE(v_history, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql;


-- RPC 2 : Rejoindre et initialiser un joueur
CREATE OR REPLACE FUNCTION public.join_and_initialize_player(
    p_game_code text,
    p_name text,
    p_pin_hash text
)
RETURNS boolean
SECURITY DEFINER
AS $$
DECLARE
    v_status text;
BEGIN
    SELECT status INTO v_status FROM public.games WHERE game_code = p_game_code;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Salon inexistant';
    END IF;

    IF v_status = 'finished' THEN
        RAISE EXCEPTION 'La partie est déjà terminée';
    END IF;

    INSERT INTO public.players (
        game_code, name, pin_hash, lives, score, skips, is_zombie, is_frozen
    ) VALUES (
        p_game_code, p_name, p_pin_hash, 7.0, 0, 2, false, false
    )
    ON CONFLICT (game_code, name) DO UPDATE 
    SET pin_hash = EXCLUDED.pin_hash;

    UPDATE public.games SET state_version = state_version + 1 WHERE game_code = p_game_code;
    RETURN true;
END;
$$ LANGUAGE plpgsql;


-- RPC 3 : Lancer la partie et créer la boucle fermée de cibles
CREATE OR REPLACE FUNCTION public.start_game_transaction(p_game_code text)
RETURNS boolean
SECURITY DEFINER
AS $$
DECLARE
    v_player_count integer;
    v_temp_players varchar(50)[];
    v_idx integer;
    v_next_idx integer;
    v_action_id integer;
BEGIN
    SELECT count(*) INTO v_player_count 
    FROM public.players 
    WHERE game_code = p_game_code AND is_frozen = false;

    IF v_player_count < 2 THEN
        RAISE EXCEPTION 'Il faut au moins 2 joueurs non gelés pour lancer la chasse.';
    END IF;

    SELECT array_agg(name) INTO v_temp_players
    FROM (
        SELECT name 
        FROM public.players 
        WHERE game_code = p_game_code AND is_frozen = false
        ORDER BY random()
    ) t;

    FOR v_idx IN 1..v_player_count LOOP
        IF v_idx = v_player_count THEN
            v_next_idx := 1;
        ELSE
            v_next_idx := v_idx + 1;
        END IF;

        SELECT id INTO v_action_id
        FROM public.action_pools
        WHERE game_code = p_game_code AND is_zombie_only = false
        ORDER BY random()
        LIMIT 1;

        UPDATE public.players
        SET target = v_temp_players[v_next_idx],
            action_id = v_action_id,
            lives = 7.0,
            score = 0,
            is_zombie = false,
            fountain_uses_today = 0,
            fountain_refreshes_today = 3
        WHERE game_code = p_game_code AND name = v_temp_players[v_idx];
    END LOOP;

    UPDATE public.games 
    SET status = 'active', 
        start_time = now(),
        state_version = state_version + 1 
    WHERE game_code = p_game_code;

    INSERT INTO public.history (game_code, player_name, type, status)
    VALUES (p_game_code, 'GM', 'game_started', 'completed');

    RETURN true;
END;
$$ LANGUAGE plpgsql;


-- RPC 4 : Validation d'un assassinat (GM)
CREATE OR REPLACE FUNCTION public.approve_hit_transaction(p_history_id bigint)
RETURNS boolean
SECURITY DEFINER
AS $$
DECLARE
    r_hist record;
    v_killer_target varchar(50);
    v_victim_target varchar(50);
    v_new_action_id integer;
    v_final_lives numeric(3,1);
    v_points_gain integer;
    v_zombie_bonus integer := 0;
    v_active_survivors integer;
BEGIN
    SELECT * INTO r_hist FROM public.history WHERE id = p_history_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Événement d''historique introuvable';
    END IF;

    IF r_hist.status != 'pending' THEN
        RETURN false;
    END IF;

    SELECT target INTO v_victim_target 
    FROM public.players 
    WHERE game_code = r_hist.game_code AND name = r_hist.target_name;

    SELECT lives INTO v_final_lives 
    FROM public.players 
    WHERE game_code = r_hist.game_code AND name = r_hist.target_name;

    v_final_lives := GREATEST(0.0, v_final_lives - r_hist.damage_penalty);

    IF v_final_lives = 0.0 THEN
        v_zombie_bonus := 200;
        
        UPDATE public.players
        SET lives = 0.0,
            is_zombie = true,
            target = NULL,
            action_id = NULL,
            stat_zombie_date = now()
        WHERE game_code = r_hist.game_code AND name = r_hist.target_name;
        
        INSERT INTO public.history (game_code, player_name, type, status)
        VALUES (r_hist.game_code, r_hist.target_name, 'player_zombified', 'completed');
    ELSE
        UPDATE public.players
        SET lives = v_final_lives
        WHERE game_code = r_hist.game_code AND name = r_hist.target_name;
    END IF;

    v_points_gain := r_hist.score_reward + v_zombie_bonus;

    SELECT id INTO v_new_action_id
    FROM public.action_pools
    WHERE game_code = r_hist.game_code AND is_zombie_only = false
    ORDER BY random()
    LIMIT 1;

    IF v_final_lives = 0.0 THEN
        UPDATE public.players
        SET score = score + v_points_gain,
            skips = skips + 1,
            target = v_victim_target,
            action_id = v_new_action_id,
            stat_kills_count = stat_kills_count + 1
        WHERE game_code = r_hist.game_code AND name = r_hist.player_name;
    ELSE
        UPDATE public.players
        SET score = score + v_points_gain,
            skips = skips + 1,
            action_id = v_new_action_id
        WHERE game_code = r_hist.game_code AND name = r_hist.player_name;
    END IF;

    UPDATE public.history
    SET status = 'completed',
        score_reward = v_points_gain
    WHERE id = p_history_id;

    SELECT count(*) INTO v_active_survivors 
    FROM public.players 
    WHERE game_code = r_hist.game_code AND is_frozen = false AND is_zombie = false;

    IF v_active_survivors = 1 THEN
        UPDATE public.games 
        SET status = 'finished',
            end_time = now()
        WHERE game_code = r_hist.game_code;
        
        INSERT INTO public.history (game_code, player_name, type, status)
        VALUES (r_hist.game_code, 'System', 'game_finished', 'completed');
    END IF;

    UPDATE public.games SET state_version = state_version + 1 WHERE game_code = r_hist.game_code;
    RETURN true;
END;
$$ LANGUAGE plpgsql;


-- RPC 5 : Rejeter un assassinat (GM)
CREATE OR REPLACE FUNCTION public.reject_hit_transaction(p_history_id bigint)
RETURNS boolean
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.history
    SET status = 'rejected'
    WHERE id = p_history_id AND status = 'pending';

    UPDATE public.games 
    SET state_version = state_version + 1 
    WHERE game_code = (SELECT game_code FROM public.history WHERE id = p_history_id);

    RETURN true;
END;
$$ LANGUAGE plpgsql;


-- RPC 6 : Arbitrage d'une contre-attaque (GM)
CREATE OR REPLACE FUNCTION public.resolve_counter_attack_transaction(
    p_history_id bigint,
    p_is_correct boolean
)
RETURNS boolean
SECURITY DEFINER
AS $$
DECLARE
    r_hist record;
    v_victim_lives numeric(3,1);
    v_new_action_id integer;
BEGIN
    SELECT * INTO r_hist FROM public.history WHERE id = p_history_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Historique introuvable';
    END IF;

    IF r_hist.status != 'pending' THEN
        RETURN false;
    END IF;

    IF p_is_correct THEN
        UPDATE public.players
        SET score = GREATEST(0, score - 25),
            stat_evaded_hits = stat_evaded_hits + 1
        WHERE game_code = r_hist.game_code AND name = r_hist.target_name;

        SELECT id INTO v_new_action_id
        FROM public.action_pools
        WHERE game_code = r_hist.game_code AND is_zombie_only = false
        ORDER BY random()
        LIMIT 1;

        UPDATE public.players
        SET action_id = v_new_action_id
        WHERE game_code = r_hist.game_code AND name = r_hist.target_name;

        UPDATE public.players
        SET stat_successful_counterattacks = stat_successful_counterattacks + 1
        WHERE game_code = r_hist.game_code AND name = r_hist.player_name;

        UPDATE public.history
        SET status = 'completed',
            type = 'counter_attack_correct'
        WHERE id = p_history_id;
    ELSE
        SELECT lives INTO v_victim_lives 
        FROM public.players 
        WHERE game_code = r_hist.game_code AND name = r_hist.player_name;

        IF v_victim_lives > 0.5 THEN
            v_victim_lives := v_victim_lives - 0.5;
        END IF;

        UPDATE public.players
        SET lives = v_victim_lives,
            stat_failed_counterattacks = stat_failed_counterattacks + 1
        WHERE game_code = r_hist.game_code AND name = r_hist.player_name;

        UPDATE public.history
        SET status = 'completed',
            type = 'counter_attack_incorrect',
            damage_penalty = 0.5
        WHERE id = p_history_id;
    END IF;

    UPDATE public.games SET state_version = state_version + 1 WHERE game_code = r_hist.game_code;
    RETURN true;
END;
$$ LANGUAGE plpgsql;


-- RPC 7 : Validation de morsure de zombie (GM)
CREATE OR REPLACE FUNCTION public.approve_zombie_bite_transaction(p_history_id bigint)
RETURNS boolean
SECURITY DEFINER
AS $$
DECLARE
    r_hist record;
    v_victim_lives numeric(3,1);
    v_victim_score integer;
    v_zombie_score integer;
    v_active_survivors integer;
    v_action_id integer;
    v_active_count integer;
    v_random_player record;
BEGIN
    SELECT * INTO r_hist FROM public.history WHERE id = p_history_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Historique introuvable';
    END IF;

    IF r_hist.status != 'pending' THEN
        RETURN false;
    END IF;

    SELECT lives, score INTO v_victim_lives, v_victim_score 
    FROM public.players 
    WHERE game_code = r_hist.game_code AND name = r_hist.target_name;

    v_victim_lives := GREATEST(0.0, v_victim_lives - 1.0);
    v_victim_score := GREATEST(0, v_victim_score - 50);

    IF v_victim_lives = 0.0 THEN
        UPDATE public.players
        SET lives = 0.0,
            is_zombie = true,
            target = NULL,
            action_id = NULL,
            score = v_victim_score,
            stat_zombie_date = now()
        WHERE game_code = r_hist.game_code AND name = r_hist.target_name;

        INSERT INTO public.history (game_code, player_name, type, status)
        VALUES (r_hist.game_code, r_hist.target_name, 'player_zombified', 'completed');
    ELSE
        UPDATE public.players
        SET lives = v_victim_lives,
            score = v_victim_score
        WHERE game_code = r_hist.game_code AND name = r_hist.target_name;
    END IF;

    SELECT score INTO v_zombie_score FROM public.players WHERE game_code = r_hist.game_code AND name = r_hist.player_name;
    v_zombie_score := v_zombie_score + 50;

    UPDATE public.players
    SET lives = 1.0,
        is_zombie = false,
        score = v_zombie_score
    WHERE game_code = r_hist.game_code AND name = r_hist.player_name;

    SELECT count(*) INTO v_active_count 
    FROM public.players 
    WHERE game_code = r_hist.game_code AND target IS NOT NULL AND is_frozen = false AND is_zombie = false;

    IF v_active_count = 0 THEN
        UPDATE public.players 
        SET target = name 
        WHERE game_code = r_hist.game_code AND name = r_hist.player_name;
    ELSE
        SELECT name, target INTO v_random_player
        FROM public.players
        WHERE game_code = r_hist.game_code AND target IS NOT NULL AND is_frozen = false AND is_zombie = false AND name != r_hist.player_name
        ORDER BY random()
        LIMIT 1;

        IF FOUND THEN
            UPDATE public.players
            SET target = r_hist.player_name
            WHERE game_code = r_hist.game_code AND name = v_random_player.name;

            UPDATE public.players
            SET target = v_random_player.target
            WHERE game_code = r_hist.game_code AND name = r_hist.player_name;
        ELSE
            UPDATE public.players 
            SET target = name 
            WHERE game_code = r_hist.game_code AND name = r_hist.player_name;
        END IF;
    END IF;

    SELECT id INTO v_action_id
    FROM public.action_pools
    WHERE game_code = r_hist.game_code AND is_zombie_only = false
    ORDER BY random()
    LIMIT 1;

    UPDATE public.players
    SET action_id = v_action_id
    WHERE game_code = r_hist.game_code AND name = r_hist.player_name;

    UPDATE public.history
    SET status = 'completed',
        type = 'zombie_bite'
    WHERE id = p_history_id;

    SELECT count(*) INTO v_active_survivors 
    FROM public.players 
    WHERE game_code = r_hist.game_code AND is_frozen = false AND is_zombie = false;

    IF v_active_survivors = 1 THEN
        UPDATE public.games 
        SET status = 'finished',
            end_time = now()
        WHERE game_code = r_hist.game_code;
        
        INSERT INTO public.history (game_code, player_name, type, status)
        VALUES (r_hist.game_code, 'System', 'game_finished', 'completed');
    END IF;

    UPDATE public.games SET state_version = state_version + 1 WHERE game_code = r_hist.game_code;
    RETURN true;
END;
$$ LANGUAGE plpgsql;


-- RPC 8 : Exfiltrer temporairement un joueur de la boucle fermée (Gel)
CREATE OR REPLACE FUNCTION public.freeze_player_transaction(
    p_game_code text,
    p_name text
)
RETURNS boolean
SECURITY DEFINER
AS $$
DECLARE
    v_killer_name varchar(50);
    v_next_target_name varchar(50);
    v_active_survivors integer;
BEGIN
    SELECT name INTO v_killer_name 
    FROM public.players 
    WHERE game_code = p_game_code AND target = p_name AND is_frozen = false AND is_zombie = false;

    SELECT target INTO v_next_target_name 
    FROM public.players 
    WHERE game_code = p_game_code AND name = p_name;

    IF v_killer_name IS NOT NULL AND v_killer_name != p_name THEN
        UPDATE public.players 
        SET target = v_next_target_name 
        WHERE game_code = p_game_code AND name = v_killer_name;
    END IF;

    UPDATE public.players 
    SET target = NULL, 
        action_id = NULL,
        is_frozen = true
    WHERE game_code = p_game_code AND name = p_name;

    INSERT INTO public.history (game_code, player_name, type, status)
    VALUES (p_game_code, p_name, 'player_frozen', 'completed');

    SELECT count(*) INTO v_active_survivors 
    FROM public.players 
    WHERE game_code = p_game_code AND is_frozen = false AND is_zombie = false;

    IF v_active_survivors = 1 THEN
        UPDATE public.games 
        SET status = 'finished',
            end_time = now()
        WHERE game_code = p_game_code;
        
        INSERT INTO public.history (game_code, player_name, type, status)
        VALUES (p_game_code, 'System', 'game_finished', 'completed');
    END IF;

    UPDATE public.games SET state_version = state_version + 1 WHERE game_code = p_game_code;
    RETURN true;
END;
$$ LANGUAGE plpgsql;


-- RPC 9 : Réintégrer un joueur gelé dans la boucle fermée
CREATE OR REPLACE FUNCTION public.unfreeze_player_transaction(
    p_game_code text,
    p_name text
)
RETURNS boolean
SECURITY DEFINER
AS $$
DECLARE
    v_active_count integer;
    v_random_player record;
    v_action_id integer;
BEGIN
    UPDATE public.players
    SET is_frozen = false
    WHERE game_code = p_game_code AND name = p_name;

    SELECT count(*) INTO v_active_count 
    FROM public.players 
    WHERE game_code = p_game_code AND target IS NOT NULL AND is_frozen = false AND is_zombie = false;

    IF v_active_count = 0 THEN
        UPDATE public.players 
        SET target = name 
        WHERE game_code = p_game_code AND name = p_name;
    ELSE
        SELECT name, target INTO v_random_player
        FROM public.players
        WHERE game_code = p_game_code AND target IS NOT NULL AND is_frozen = false AND is_zombie = false AND name != p_name
        ORDER BY random()
        LIMIT 1;

        IF FOUND THEN
            UPDATE public.players
            SET target = p_name
            WHERE game_code = p_game_code AND name = v_random_player.name;

            UPDATE public.players
            SET target = v_random_player.target
            WHERE game_code = p_game_code AND name = p_name;
        ELSE
            UPDATE public.players 
            SET target = name 
            WHERE game_code = p_game_code AND name = p_name;
        END IF;
    END IF;

    SELECT id INTO v_action_id
    FROM public.action_pools
    WHERE game_code = p_game_code AND is_zombie_only = false
    ORDER BY random()
    LIMIT 1;

    UPDATE public.players
    SET action_id = v_action_id
    WHERE game_code = p_game_code AND name = p_name;

    INSERT INTO public.history (game_code, player_name, type, status)
    VALUES (p_game_code, p_name, 'player_unfrozen', 'completed');

    UPDATE public.games SET state_version = state_version + 1 WHERE game_code = p_game_code;
    RETURN true;
END;
$$ LANGUAGE plpgsql;


-- RPC 10 : Le Chant du Coq (Collectif - Passer au matin)
CREATE OR REPLACE FUNCTION public.rooster_crow_transaction(p_game_code text)
RETURNS boolean
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.players
    SET skips = skips + 1,
        fountain_uses_today = 0,
        fountain_refreshes_today = fountain_refreshes_today + 3
    WHERE game_code = p_game_code;

    INSERT INTO public.history (game_code, player_name, type, status)
    VALUES (p_game_code, 'GM', 'rooster_crow', 'completed');

    UPDATE public.games SET state_version = state_version + 1 WHERE game_code = p_game_code;
    RETURN true;
END;
$$ LANGUAGE plpgsql;


-- RPC 11 : Générer un code PIN de secours pour un joueur
CREATE OR REPLACE FUNCTION public.reset_player_pin(
    p_game_code text,
    p_name text
)
RETURNS text
SECURITY DEFINER
AS $$
DECLARE
    v_pin text;
    v_pin_hash varchar(64);
BEGIN
    v_pin := lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    v_pin_hash := encode(sha256(v_pin::bytea), 'hex');

    UPDATE public.players
    SET pin_hash = v_pin_hash
    WHERE game_code = p_game_code AND name = p_name;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Joueur introuvable';
    END IF;

    RETURN v_pin;
END;
$$ LANGUAGE plpgsql;


-- RPC 12 : Retrait d'un joueur par suppression définitive (GM)
CREATE OR REPLACE FUNCTION public.remove_player_transaction(
    p_game_code text,
    p_name text
)
RETURNS boolean
SECURITY DEFINER
AS $$
DECLARE
    v_killer_name varchar(50);
    v_next_target_name varchar(50);
    v_active_survivors integer;
BEGIN
    SELECT name INTO v_killer_name 
    FROM public.players 
    WHERE game_code = p_game_code AND target = p_name AND is_frozen = false AND is_zombie = false;

    SELECT target INTO v_next_target_name 
    FROM public.players 
    WHERE game_code = p_game_code AND name = p_name;

    IF v_killer_name IS NOT NULL AND v_killer_name != p_name THEN
        UPDATE public.players 
        SET target = v_next_target_name 
        WHERE game_code = p_game_code AND name = v_killer_name;
    END IF;

    DELETE FROM public.players 
    WHERE game_code = p_game_code AND name = p_name;

    INSERT INTO public.history (game_code, player_name, type, status)
    VALUES (p_game_code, p_name, 'player_kicked', 'completed');

    SELECT count(*) INTO v_active_survivors 
    FROM public.players 
    WHERE game_code = p_game_code AND is_frozen = false AND is_zombie = false;

    IF v_active_survivors = 1 THEN
        UPDATE public.games 
        SET status = 'finished',
            end_time = now()
        WHERE game_code = p_game_code;
        
        INSERT INTO public.history (game_code, player_name, type, status)
        VALUES (p_game_code, 'System', 'game_finished', 'completed');
    END IF;

    UPDATE public.games SET state_version = state_version + 1 WHERE game_code = p_game_code;
    RETURN true;
END;
$$ LANGUAGE plpgsql;


-- RPC 13 : Relance (Skip) d'un défi (Joueur)
CREATE OR REPLACE FUNCTION public.skip_player_mission_transaction(
    p_game_code text,
    p_name text
)
RETURNS boolean
SECURITY DEFINER
AS $$
DECLARE
    v_skips integer;
    v_new_action_id integer;
BEGIN
    SELECT skips INTO v_skips 
    FROM public.players 
    WHERE game_code = p_game_code AND name = p_name FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Joueur introuvable';
    END IF;

    IF v_skips < 1 THEN
        RAISE EXCEPTION 'Nombre de jetons de relance épuisé';
    END IF;

    SELECT id INTO v_new_action_id
    FROM public.action_pools
    WHERE game_code = p_game_code AND is_zombie_only = false
    ORDER BY random()
    LIMIT 1;

    UPDATE public.players
    SET skips = skips - 1,
        action_id = v_new_action_id,
        stat_skips_missions = stat_skips_missions + 1
    WHERE game_code = p_game_code AND name = p_name;

    INSERT INTO public.history (game_code, player_name, type, status)
    VALUES (p_game_code, p_name, 'skip_mission', 'completed');

    UPDATE public.games SET state_version = state_version + 1 WHERE game_code = p_game_code;
    RETURN true;
END;
$$ LANGUAGE plpgsql;


-- RPC 14 : Abandon de cible
CREATE OR REPLACE FUNCTION public.abandon_target_transaction(
    p_game_code text,
    p_name text,
    p_penalty_type text
)
RETURNS boolean
SECURITY DEFINER
AS $$
DECLARE
    v_score integer;
    v_lives numeric(3,1);
    v_killer_name varchar(50);
    v_current_target varchar(50);
    v_random_player record;
    v_active_count integer;
BEGIN
    SELECT score, lives, target INTO v_score, v_lives, v_current_target
    FROM public.players
    WHERE game_code = p_game_code AND name = p_name FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Joueur introuvable';
    END IF;

    IF v_current_target IS NULL THEN
        RAISE EXCEPTION 'Pas de cible à abandonner';
    END IF;

    IF p_penalty_type = 'score' THEN
        IF v_score < 50 THEN
            RAISE EXCEPTION 'Score insuffisant pour payer la pénalité';
        END IF;
        v_score := v_score - 50;
    ELSIF p_penalty_type = 'life' THEN
        IF v_lives <= 0.5 THEN
            RAISE EXCEPTION 'Vitalité insuffisante pour payer la pénalité';
        END IF;
        v_lives := v_lives - 0.5;
    ELSE
        RAISE EXCEPTION 'Type de pénalité inconnu';
    END IF;

    SELECT name INTO v_killer_name 
    FROM public.players 
    WHERE game_code = p_game_code AND target = p_name AND is_frozen = false AND is_zombie = false;

    IF v_killer_name IS NOT NULL AND v_killer_name != p_name THEN
        UPDATE public.players 
        SET target = v_current_target 
        WHERE game_code = p_game_code AND name = v_killer_name;
    END IF;

    UPDATE public.players
    SET score = v_score,
        lives = v_lives,
        stat_abandon_count = stat_abandon_count + 1
    WHERE game_code = p_game_code AND name = p_name;

    SELECT count(*) INTO v_active_count 
    FROM public.players 
    WHERE game_code = p_game_code AND target IS NOT NULL AND is_frozen = false AND is_zombie = false AND name != p_name;

    IF v_active_count = 0 THEN
        UPDATE public.players 
        SET target = name 
        WHERE game_code = p_game_code AND name = p_name;
    ELSE
        SELECT name, target INTO v_random_player
        FROM public.players
        WHERE game_code = p_game_code AND target IS NOT NULL AND is_frozen = false AND is_zombie = false AND name != p_name
        ORDER BY random()
        LIMIT 1;

        IF FOUND THEN
            UPDATE public.players
            SET target = p_name
            WHERE game_code = p_game_code AND name = v_random_player.name;

            UPDATE public.players
            SET target = v_random_player.target
            WHERE game_code = p_game_code AND name = p_name;
        ELSE
            UPDATE public.players 
            SET target = name 
            WHERE game_code = p_game_code AND name = p_name;
        END IF;
    END IF;

    INSERT INTO public.history (game_code, player_name, type, status, score_reward, damage_penalty)
    VALUES (
        p_game_code, p_name, 'abandon_target', 'completed', 
        CASE WHEN p_penalty_type = 'score' THEN -50 ELSE 0 END,
        CASE WHEN p_penalty_type = 'life' THEN 0.5 ELSE 0.0 END
    );

    UPDATE public.games SET state_version = state_version + 1 WHERE game_code = p_game_code;
    RETURN true;
END;
$$ LANGUAGE plpgsql;


-- RPC 15 : Se soigner à la Fontaine de vie
CREATE OR REPLACE FUNCTION public.use_fountain_transaction(
    p_game_code text,
    p_name text,
    p_fountain_type text,
    p_proof text,
    p_gain_lives numeric
)
RETURNS boolean
SECURITY DEFINER
AS $$
DECLARE
    v_lives numeric(3,1);
    v_uses_today integer;
    v_is_zombie boolean;
    v_active_title varchar(255);
BEGIN
    SELECT lives, fountain_uses_today, is_zombie, fountain_active_title INTO v_lives, v_uses_today, v_is_zombie, v_active_title
    FROM public.players
    WHERE game_code = p_game_code AND name = p_name FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Joueur introuvable';
    END IF;

    IF v_is_zombie THEN
        RAISE EXCEPTION 'Les zombies ne peuvent pas utiliser la Fontaine';
    END IF;

    IF v_uses_today >= 2 THEN
        RAISE EXCEPTION 'Utilisations quotidiennes de la Fontaine épuisées';
    END IF;

    IF v_lives >= 7.0 THEN
        RAISE EXCEPTION 'Vitalité déjà au maximum';
    END IF;

    v_lives := LEAST(7.0, v_lives + p_gain_lives);

    UPDATE public.players
    SET lives = v_lives,
        fountain_uses_today = fountain_uses_today + 1,
        fountain_total_uses = fountain_total_uses + 1,
        fountain_active_type = NULL,
        fountain_active_title = NULL,
        fountain_active_description = NULL,
        stat_fountain_uses = stat_fountain_uses + 1
    WHERE game_code = p_game_code AND name = p_name;

    INSERT INTO public.history (game_code, player_name, type, status, action_title, damage_penalty, photo_proof)
    VALUES (p_game_code, p_name, 'fountain_use', 'completed', v_active_title, -p_gain_lives, p_proof);

    UPDATE public.games SET state_version = state_version + 1 WHERE game_code = p_game_code;
    RETURN true;
END;
$$ LANGUAGE plpgsql;


-- RPC 16 : Passer/Relancer le défi de fontaine
CREATE OR REPLACE FUNCTION public.refresh_fountain_challenge_transaction(
    p_game_code text,
    p_name text,
    p_new_title varchar(255),
    p_new_desc text,
    p_new_type varchar(20)
)
RETURNS boolean
SECURITY DEFINER
AS $$
DECLARE
    v_refreshes integer;
BEGIN
    SELECT fountain_refreshes_today INTO v_refreshes
    FROM public.players
    WHERE game_code = p_game_code AND name = p_name FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Joueur introuvable';
    END IF;

    IF v_refreshes < 1 THEN
        RAISE EXCEPTION 'Nombre de relances de la Fontaine épuisé';
    END IF;

    UPDATE public.players
    SET fountain_refreshes_today = fountain_refreshes_today - 1,
        fountain_active_type = p_new_type,
        fountain_active_title = p_new_title,
        fountain_active_description = p_new_desc,
        stat_skips_fountain = stat_skips_fountain + 1
    WHERE game_code = p_game_code AND name = p_name;

    UPDATE public.games SET state_version = state_version + 1 WHERE game_code = p_game_code;
    RETURN true;
END;
$$ LANGUAGE plpgsql;
