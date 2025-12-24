// Adicione após o objeto AudioSys no game.js:

const Transition = {
    active: false,
    type: null,
    duration: 1000,
    startTime: null,
    
    fadeOut: (callback) => {
        Transition.active = true;
        Transition.type = 'fadeOut';
        Transition.startTime = Date.now();
        Transition.callback = callback;
        
        const overlay = document.createElement('div');
        overlay.id = 'transition-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            opacity: 0;
            z-index: 100;
            pointer-events: none;
            transition: opacity 0.5s ease;
        `;
        document.getElementById('game-container').appendChild(overlay);
        
        setTimeout(() => {
            overlay.style.opacity = '1';
            setTimeout(() => {
                if (callback) callback();
                Transition.fadeIn();
            }, 500);
        }, 10);
    },
    
    fadeIn: () => {
        const overlay = document.getElementById('transition-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                Transition.active = false;
            }, 500);
        }
    },
    
    screenShake: (intensity = 10, duration = 200) => {
        const container = document.getElementById('game-container');
        const originalPosition = container.style.transform;
        
        let startTime = Date.now();
        const shake = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                const x = (Math.random() - 0.5) * 2 * intensity * (1 - elapsed/duration);
                const y = (Math.random() - 0.5) * 2 * intensity * (1 - elapsed/duration);
                container.style.transform = `translate(${x}px, ${y}px)`;
                requestAnimationFrame(shake);
            } else {
                container.style.transform = originalPosition;
            }
        };
        shake();
    }
};

// --- 1. CONFIGURAÇÃO E DADOS ---

const Assets = {
    chars: {
        'pinguitor': 'assets/pinguitor.png',
        'goodways': 'assets/goodways.png',
        'kalelfreira': 'assets/kal-elfeliz.png',
        'kalelfreirabravo': 'assets/kal-elbravo.png',
        'kalelfreiratriste': 'assets/kal-eltriste.png',
        'bigc': 'assets/bigcarlos-triste.png',
        'nobody': 'assets/nobody.png' // Imagem vazia ou transparente
    },
    bg: {
        'ufs': 'assets/fundo_ufs.jpg',
        'resun': 'assets/ufs_resun.jpg',
        'reitoria': 'assets/ufs_reitoria.jpg',
        'adufs': 'assets/ufs_adufs.jpg',
        'cafe': 'assets/fotocafe.jpg',
        'pergaminho': 'assets/pergaminhododev.jpg',
        'gameover': 'assets/mauscaminhos.jpg'
    }
};

const Game = {
    state: "LOADING",
    inventory: [],
    currentScene: null,
    
    // Canvas & Game Loop
    canvas: null,
    ctx: null,
    loopId: null,
    
    // Estado do Minigame Atual
    minigame: {
        mode: null, // 'ARENA' (AdCoffee) ou 'GRID' (Labirinto)
        player: { x: 0, y: 0, w: 50, h: 50, speed: 5 },
        entities: [], // Obstáculos, Inimigos
        collectibles: [],
        requiredScore: 0
    }
};

// --- 2. ROTEIRO (ADAPTADO DO INDEX2) ---
const Scripts = {
    "inicio": {
        bg: Assets.bg.ufs,
        char: "pinguitor",
        text: "Olá! Seja bem-vindo ao DCOMP! Eu sou o Pinguitor, líder do clã Bugados. Escolha uma rota:",
        choices: [
            { text: "A. Rota do Peregrino (Good Ways)", next: "gw_ola" },
            { text: "B. Rota do Arauto (Kal-El)", next: "kal_ola" },
            { text: "C. Rota do AdCoffee (Desafio)", next: "ad_intro" }
        ]
    },
    
    // --- ROTA GOOD WAYS ---
    "gw_ola": {
        bg: Assets.bg.resun, char: "goodways",
        text: "Dcomper, viva! Hoje te guiarei pelos bons caminhos da nossa universidade!",
        choices: [{ text: "Quem é você?", next: "gw_intro" }]
    },
    "gw_intro": {
        bg: Assets.bg.resun, char: "goodways",
        text: "Sou Good Ways, professor do DCOMP e secretário regional da SBC!",
        choices: [{ text: "O que é SBC?", next: "gw_sbc" }]
    },
    "gw_sbc": {
        bg: Assets.bg.resun, char: "goodways",
        text: "Sociedade Brasileira de Computação! Contribuímos da formação aos eventos.",
        choices: [{ text: "Entendi. Vamos aos 'Bons Caminhos'?", next: "gw_lab_intro" }]
    },
    "gw_lab_intro": {
        bg: Assets.bg.resun, char: "goodways",
        text: "Para se tornar um Dcomper, você deve passar pelo Labirinto. Cuidado com os espinhos!",
        choices: [{ text: "Estou pronto!", action: "START_LABIRINTO" }]
    },
    "gw_win": {
        bg: Assets.bg.resun, char: "goodways",
        text: "Viva! Você concluiu a missão com êxito. Pegue sua recompensa.",
        choices: [{ text: "Pegar Pergaminho", next: "end_pergaminho" }]
    },
    "gw_lose": {
        bg: Assets.bg.gameover, char: "nobody",
        text: "VOCÊ INVOCOU A IRA DO BADWAYS! Tentar de novo?",
        choices: [
            { text: "Tentar Novamente", action: "START_LABIRINTO" },
            { text: "Voltar ao Início", next: "inicio" }
        ]
    },

    // --- ROTA KAL-EL (QUIZ) ---
    "kal_ola": {
        bg: Assets.bg.reitoria, char: "kalelfreira",
        text: "Olá! Me chamo Kal-El Freira. Vou lhe ensinar as normas da Cidade Universitária.",
        choices: [{ text: "É tipo etiqueta?", next: "kal_selva" }]
    },
    "kal_selva": {
        bg: Assets.bg.reitoria, char: "kalelfreira",
        text: "Não! A UFS é uma selva. As normas são sua proteção contra predadores.",
        choices: [{ text: "Como consigo as normas?", next: "kal_missao" }]
    },
    "kal_missao": {
        bg: Assets.bg.reitoria, char: "kalelfreira",
        text: "Vou te fazer perguntas. Se errar, será JUBILADO!",
        choices: [{ text: "Manda ver.", next: "kal_q1" }]
    },
    "kal_q1": {
        bg: Assets.bg.reitoria, char: "kalelfreira",
        text: "Pergunta 1: Qual a regra da toalha segundo o Guia do Mochileiro?",
        choices: [
            { text: "Item mais valioso do mochileiro.", next: "kal_q2" }, // Correta
            { text: "Só usar em planetas com 21% de oxigênio.", next: "kal_jubilado" },
            { text: "Deve ser sempre azul.", next: "kal_jubilado" }
        ]
    },
    "kal_q2": {
        bg: Assets.bg.reitoria, char: "kalelfreira",
        text: "Pergunta 2: Um professor pode ameaçar aluno com arma por colar?",
        choices: [
            { text: "Claro, medidas cabíveis.", next: "kal_jubilado" },
            { text: "Não. É crime, independente de normas.", next: "kal_q3" } // Correta
        ]
    },
    "kal_q3": {
        bg: Assets.bg.reitoria, char: "kalelfreira",
        text: "Pergunta 3: Qual a derivada de (sen(x))^2?",
        choices: [
            { text: "2 sen(x)", next: "kal_jubilado" },
            { text: "2sen(x)cos(x)", next: "kal_win" }, // Correta
            { text: "-2sen(x)cos(x)", next: "kal_jubilado" }
        ]
    },
    "kal_jubilado": {
        bg: Assets.bg.reitoria, char: "kalelfreiratriste",
        text: "VOCÊ FOI JUBILADO! Tente outra vez.",
        choices: [{ text: "Reiniciar", next: "inicio" }]
    },
    "kal_win": {
        bg: Assets.bg.reitoria, char: "kalelfreira",
        text: "Parabéns! Você tem acesso às runas nôrmicas.",
        choices: [{ text: "Concluir", next: "inicio" }]
    },

    // --- ROTA ADCOFFEE (ARENA) ---
    "ad_intro": {
        bg: Assets.bg.adufs, char: "pinguitor",
        text: "Colete 10 broches para vencer o Guardião do Café. Cuidado com o Big C!",
        choices: [{ text: "Vamos nessa!", action: "START_ARENA" }]
    },
    "ad_win": {
        bg: Assets.bg.adufs, char: "pinguitor",
        text: "Você venceu! Entre para pegar sua recompensa.",
        choices: [{ text: "Pegar Café", next: "end_cafe" }]
    },
    "ad_lose": {
        bg: Assets.bg.adufs, char: "pinguitor",
        text: "O Big C te pegou. Tentar de novo?",
        choices: [
            { text: "Revanche", action: "START_ARENA" },
            { text: "Desistir", next: "inicio" }
        ]
    },

    // --- FINAIS ---
    "end_pergaminho": {
        bg: Assets.bg.pergaminho, char: "nobody",
        text: "Você obteve o PERGAMINHO DO PODEROSO DEV!",
        choices: [{ text: "Reiniciar", next: "inicio" }]
    },
    "end_cafe": {
        bg: Assets.bg.cafe, char: "nobody",
        text: "Você obteve o CAFÉ LENDÁRIO!",
        choices: [{ text: "Reiniciar", next: "inicio" }]
    }
};

// --- 3. ENGINE CORE ---

window.onload = () => {
    Game.canvas = document.getElementById("game-canvas");
    Game.ctx = Game.canvas.getContext("2d");
    Input.init();
    Engine.loadScene("inicio");
    requestAnimationFrame(Engine.gameLoop);
};

const Engine = {
    loadScene: (sceneId) => {
        Game.state = "NOVEL";
        AudioSys.playMusic('bgm-main');
        
        const scene = Scripts[sceneId];
        Game.currentScene = scene;

        // Atualizar UI
        document.getElementById("novel-layer").style.display = "block";
        document.getElementById("game-canvas").style.display = "none";
        
        document.getElementById("background-layer").style.backgroundImage = `url('${scene.bg}')`;
        
        const charImg = document.getElementById("char-sprite");
        if (Assets.chars[scene.char] && scene.char !== 'nobody') {
            charImg.src = Assets.chars[scene.char];
            charImg.style.display = "block";
        } else {
            charImg.style.display = "none";
        }

        document.getElementById("speaker-name").innerText = scene.char === 'nobody' ? '' : scene.char.toUpperCase();
        document.getElementById("dialogue-text").innerText = scene.text;

        // Gerar Botões
        const choicesDiv = document.getElementById("choices-container");
        choicesDiv.innerHTML = "";
        scene.choices.forEach(c => {
            const btn = document.createElement("button");
            btn.className = "choice-btn";
            btn.innerText = c.text;
            btn.onclick = () => {
                if (c.action === "START_ARENA") Minigame.startArena();
                else if (c.action === "START_LABIRINTO") Minigame.startMaze();
                else Engine.loadScene(c.next);
            };
            choicesDiv.appendChild(btn);
        });
    },

    gameLoop: () => {
        if (Game.state === "GAME") {
            Game.ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
            Physics.update();
            Renderer.draw();
        }
        requestAnimationFrame(Engine.gameLoop);
    }
};

// --- 4. SISTEMA DE MINIGAMES (Híbrido: Grid & Arena) ---

const Minigame = {
    startArena: () => {
        Game.state = "GAME";
        AudioSys.playMusic('bgm-minigame');
        UI.hideNovel();

        Game.minigame.mode = "ARENA";
        Game.minigame.player = { x: 650, y: 300, w: 50, h: 50, color: 'blue', type: 'player' };
        
        // Configurar Obstáculos (Baseado no index2)
        Game.minigame.entities = [
            { x: 100, y: 300, w: 50, h: 50, type: 'wall' },
            { x: 300, y: 100, w: 50, h: 50, type: 'wall' },
            { x: 500, y: 400, w: 50, h: 50, type: 'wall' },
            { x: 700, y: 200, w: 50, h: 50, type: 'wall' },
            { x: 900, y: 350, w: 50, h: 50, type: 'wall' },
            { x: 1100, y: 150, w: 50, h: 50, type: 'wall' },
            // Inimigos
            { x: 100, y: 20, w: 60, h: 60, type: 'enemy', speed: 2.5 },
            { x: 890, y: 500, w: 60, h: 60, type: 'enemy', speed: 4.0 }
        ];

        // Broches
        Game.minigame.collectibles = [
            { x: 50, y: 50 }, { x: 750, y: 300 }, { x: 250, y: 200 },
            { x: 100, y: 400 }, { x: 300, y: 200 }, { x: 600, y: 100 },
            { x: 200, y: 500 }, { x: 800, y: 250 }, { x: 350, y: 50 }
        ].map(p => ({ ...p, w: 20, h: 20, active: true }));
        
        Game.minigame.requiredScore = Game.minigame.collectibles.length;
    },

    startMaze: () => {
        Game.state = "GAME";
        AudioSys.playMusic('bgm-maze');
        UI.hideNovel();

        Game.minigame.mode = "GRID";
        Game.minigame.player = { x: 50, y: 350, w: 20, h: 20, color: '#880afe', type: 'player' };
        
        // Labirinto simples (simulando index2) - x,y coordenadas diretas
        Game.minigame.entities = [];
        // Gerando paredes ao redor
        Game.minigame.entities.push({x:0, y:0, w:878, h:20, type:'wall'}); // Topo
        Game.minigame.entities.push({x:0, y:540, w:878, h:20, type:'wall'}); // Fundo
        
        // Obstáculos mortais do labirinto
        const spikes = [
             { x: 150, y: 100 }, { x: 250, y: 250 }, { x: 400, y: 400 },
             { x: 500, y: 100 }, { x: 600, y: 300 }, { x: 700, y: 150 }
        ];
        
        spikes.forEach(s => {
            Game.minigame.entities.push({ x: s.x, y: s.y, w: 40, h: 20, type: 'spike' });
        });

        Game.minigame.collectibles = [{ x: 800, y: 325, w: 20, h: 20, active: true }];
        Game.minigame.requiredScore = 1;
    }
};

// --- 5. FÍSICA E COLISÃO ---

const Physics = {
    update: () => {
        const player = Game.minigame.player;
        let dx = 0; let dy = 0;
        const speed = 5;

        if (Input.keys.ArrowUp) dy = -speed;
        if (Input.keys.ArrowDown) dy = speed;
        if (Input.keys.ArrowLeft) dx = -speed;
        if (Input.keys.ArrowRight) dx = speed;

        // Movimento Proposto
        const nextX = player.x + dx;
        const nextY = player.y + dy;
        const width = Game.canvas.width;
        const height = Game.canvas.height;

        // 1. Limites da Tela
        if (nextX >= 0 && nextX + player.w <= width) player.x = nextX;
        if (nextY >= 0 && nextY + player.h <= height) player.y = nextY;

        // 2. Colisão com Obstáculos e Inimigos
        Game.minigame.entities.forEach(ent => {
            // AABB Collision
            if (CheckCollision(player, ent)) {
                if (ent.type === 'wall') {
                    // Reverte movimento simples
                    player.x -= dx;
                    player.y -= dy;
                }
                else if (ent.type === 'enemy' || ent.type === 'spike') {
                    AudioSys.playSFX('sfx-lose');
                    if (Game.minigame.mode === 'ARENA') Engine.loadScene('ad_lose');
                    else Engine.loadScene('gw_lose');
                }
            }

            // IA do Inimigo (Perseguição Simples)
            if (ent.type === 'enemy') {
                const diffX = player.x - ent.x;
                const diffY = player.y - ent.y;
                const dist = Math.sqrt(diffX*diffX + diffY*diffY);
                if (dist > 10) { // Não colar
                    ent.x += (diffX / dist) * ent.speed;
                    ent.y += (diffY / dist) * ent.speed;
                }
            }
        });

        // 3. Coletáveis
        let collectedCount = 0;
        Game.minigame.collectibles.forEach(c => {
            if (c.active) {
                if (CheckCollision(player, c)) {
                    c.active = false;
                    AudioSys.playSFX('sfx-collect');
                }
            } else {
                collectedCount++;
            }
        });

        // 4. Checar Vitória
        if (collectedCount >= Game.minigame.requiredScore) {
            if (Game.minigame.mode === 'ARENA') Engine.loadScene('ad_win');
            else Engine.loadScene('gw_win');
        }
    }
};

const CheckCollision = (rect1, rect2) => {
    return (rect1.x < rect2.x + rect2.w &&
            rect1.x + rect1.w > rect2.x &&
            rect1.y < rect2.y + rect2.h &&
            rect1.y + rect1.h > rect2.y);
};

// --- 6. RENDERIZAÇÃO ---

const Renderer = {
    draw: () => {
        const ctx = Game.ctx;
        
        // Fundo
        ctx.fillStyle = Game.minigame.mode === 'ARENA' ? "#333" : "#111";
        ctx.fillRect(0, 0, Game.canvas.width, Game.canvas.height);

        // Entidades
        Game.minigame.entities.forEach(e => {
            if (e.type === 'wall') ctx.fillStyle = "#555";
            else if (e.type === 'enemy') ctx.fillStyle = "red"; // Imagem 'bigc' aqui se quiser
            else if (e.type === 'spike') ctx.fillStyle = "#f00";
            
            ctx.fillRect(e.x, e.y, e.w, e.h);
        });

        // Coletáveis
        ctx.fillStyle = "gold";
        Game.minigame.collectibles.forEach(c => {
            if (c.active) {
                ctx.beginPath();
                ctx.arc(c.x + c.w/2, c.y + c.h/2, c.w/2, 0, Math.PI*2);
                ctx.fill();
            }
        });

        // Jogador
        const p = Game.minigame.player;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
    }
};

// --- 7. UTILITÁRIOS ---

const Input = {
    keys: {},
    init: () => {
        window.addEventListener("keydown", e => Input.keys[e.key] = true);
        window.addEventListener("keyup", e => Input.keys[e.key] = false);
    }
};

const UI = {
    hideNovel: () => {
        document.getElementById("novel-layer").style.display = "none";
        document.getElementById("game-canvas").style.display = "block";
    }
};

const AudioSys = {
    playMusic: (id) => {
        ['bgm-main', 'bgm-minigame', 'bgm-maze'].forEach(mid => {
            const el = document.getElementById(mid);
            if(el) { el.pause(); el.currentTime = 0; }
        });
        const target = document.getElementById(id);
        if(target) target.play().catch(e => console.log("Audio play blocked"));
    },
    playSFX: (id) => {
        const el = document.getElementById(id);
        if(el) { el.currentTime = 0; el.play(); }
    }
};
