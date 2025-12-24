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
        'nobody': 'assets/nobody.png'
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

const QuizData = [
    { pergunta: "Qual a cor do céu?", opcoes: ["Verde", "Azul", "Roxo"], correta: 1 },
    { pergunta: "1 + 1 é igual a...?", opcoes: ["11", "2", "Batata"], correta: 1 },
    { pergunta: "Qual o melhor curso?", opcoes: ["Medicina", "Direito", "Comp"], correta: 2 },
    { pergunta: "O HTML é uma linguagem de...?", opcoes: ["Programação", "Marcação", "Estilização"], correta: 1 }
];

const Game = {
    state: "LOADING",
    currentScene: null,
    canvas: null,
    ctx: null,
    
    // Estado do Minigame
    minigame: {
        mode: null, // 'ARENA' ou 'QUIZ'
        player: { x: 0, y: 0, w: 50, h: 50, speed: 5, color: 'blue' },
        entities: [],
        collectibles: [],
        requiredScore: 0,
        quizLevel: 0
    }
};

// --- 2. ROTEIRO ---
const Scripts = {
    "inicio": {
        bg: Assets.bg.ufs, char: "pinguitor",
        text: "Olá! Seja bem-vindo ao DCOMP! Eu sou o Pinguitor. Escolha uma rota:",
        choices: [
            { text: "A. Rota do Peregrino (Good Ways)", next: "gw_ola" },
            { text: "B. Rota do Arauto (Kal-El)", next: "kal_ola" },
            { text: "C. Rota do AdCoffee (Desafio)", next: "ad_intro" }
        ]
    },
    
    // ROTA GOOD WAYS (QUIZ)
    "gw_ola": { bg: Assets.bg.resun, char: "goodways", text: "Dcomper, viva! Hoje te guiarei pelos bons caminhos!", choices: [{ text: "Quem é você?", next: "gw_intro" }] },
    "gw_intro": { bg: Assets.bg.resun, char: "goodways", text: "Sou Good Ways, professor do DCOMP e secretário da SBC!", choices: [{ text: "O que é SBC?", next: "gw_sbc" }] },
    "gw_sbc": { bg: Assets.bg.resun, char: "goodways", text: "Sociedade Brasileira de Computação! Contribuímos da formação aos eventos.", choices: [{ text: "Entendi. Vamos começar?", next: "gw_lab_intro" }] },
    "gw_lab_intro": { bg: Assets.bg.resun, char: "goodways", text: "Para ser um Dcomper, responda as perguntas corretamente nas portas!", choices: [{ text: "Estou pronto!", action: "START_MAZE" }] },
    "gw_win": { bg: Assets.bg.resun, char: "goodways", text: "Viva! Você concluiu a missão! Pegue sua recompensa.", choices: [{ text: "Pegar Pergaminho", next: "end_pergaminho" }] },
    "gw_lose": { bg: Assets.bg.gameover, char: "nobody", text: "VOCÊ ERROU A PORTA! Tentar de novo?", choices: [{ text: "Tentar Novamente", action: "START_MAZE" }, { text: "Voltar ao Início", next: "inicio" }] },

    // ROTA KAL-EL (Visual Novel Pura)
    "kal_ola": { bg: Assets.bg.reitoria, char: "kalelfreira", text: "Olá! Sou Kal-El Freira. Vou lhe ensinar as normas!", choices: [{ text: "Normas?", next: "kal_selva" }] },
    "kal_selva": { bg: Assets.bg.reitoria, char: "kalelfreira", text: "A UFS é uma selva. As normas te protegem!", choices: [{ text: "Entendi", next: "kal_missao" }] },
    "kal_missao": { bg: Assets.bg.reitoria, char: "kalelfreira", text: "Responda corretamente ou será JUBILADO!", choices: [{ text: "Manda ver", next: "kal_q1" }] },
    "kal_q1": { bg: Assets.bg.reitoria, char: "kalelfreira", text: "Regra da toalha (Guia do Mochileiro)?", choices: [{ text: "Item mais valioso", next: "kal_q2" }, { text: "Só em dias pares", next: "kal_jubilado" }] },
    "kal_q2": { bg: Assets.bg.reitoria, char: "kalelfreira", text: "Professor pode ameaçar com arma?", choices: [{ text: "Sim", next: "kal_jubilado" }, { text: "Não, é crime", next: "kal_q3" }] },
    "kal_q3": { bg: Assets.bg.reitoria, char: "kalelfreira", text: "Derivada de (sen(x))^2?", choices: [{ text: "2sen(x)cos(x)", next: "kal_win" }, { text: "0", next: "kal_jubilado" }] },
    "kal_jubilado": { bg: Assets.bg.reitoria, char: "kalelfreiratriste", text: "JUBILADO!", choices: [{ text: "Reiniciar", next: "inicio" }] },
    "kal_win": { bg: Assets.bg.reitoria, char: "kalelfreira", text: "Parabéns! Você conhece as normas.", choices: [{ text: "Concluir", next: "inicio" }] },

    // ROTA ADCOFFEE (ARENA)
    "ad_intro": { bg: Assets.bg.adufs, char: "pinguitor", text: "Colete 10 broches e fuja do Big C!", choices: [{ text: "Vamos nessa!", action: "START_ARENA" }] },
    "ad_win": { bg: Assets.bg.adufs, char: "pinguitor", text: "Você venceu! O Café Lendário é seu.", choices: [{ text: "Pegar Café", next: "end_cafe" }] },
    "ad_lose": { bg: Assets.bg.adufs, char: "bigc", text: "O Big C te pegou! Mais sorte na próxima.", choices: [{ text: "Revanche", action: "START_ARENA" }, { text: "Desistir", next: "inicio" }] },

    // FINAIS
    "end_pergaminho": { bg: Assets.bg.pergaminho, char: "nobody", text: "Você obteve o PERGAMINHO DO PODEROSO DEV!", choices: [{ text: "Reiniciar", next: "inicio" }] },
    "end_cafe": { bg: Assets.bg.cafe, char: "nobody", text: "Você obteve o CAFÉ LENDÁRIO!", choices: [{ text: "Reiniciar", next: "inicio" }] }
};

// --- 3. ENGINE E LOGICA ---

const Engine = {
    loadScene: (sceneId) => {
        Game.state = "NOVEL";
        AudioSys.playMusic('bgm-main');
        
        const scene = Scripts[sceneId];
        Game.currentScene = scene;

        // UI Switch
        document.getElementById("novel-layer").style.display = "block";
        document.getElementById("game-canvas").style.display = "none";
        
        // Render Novel Elements
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

        // Buttons
        const choicesDiv = document.getElementById("choices-container");
        choicesDiv.innerHTML = "";
        scene.choices.forEach(c => {
            const btn = document.createElement("button");
            btn.className = "choice-btn";
            btn.innerText = c.text;
            btn.onclick = () => {
                if (c.action === "START_ARENA") Minigame.startArena();
                else if (c.action === "START_MAZE") Minigame.startMaze();
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

const Minigame = {
    startArena: () => {
        Game.state = "GAME";
        AudioSys.playMusic('bgm-minigame');
        document.getElementById("novel-layer").style.display = "none";
        document.getElementById("game-canvas").style.display = "block";

        Game.minigame.mode = "ARENA";
        // Jogador Cyan para contraste
        Game.minigame.player = { x: 650, y: 300, w: 40, h: 40, color: 'cyan', type: 'player' };
        
        // Limpa lista de portas do outro jogo
        Game.minigame.entities = [
            // Paredes (Agora Pratas para ver melhor)
            { x: 100, y: 300, w: 50, h: 50, type: 'wall' },
            { x: 300, y: 100, w: 50, h: 50, type: 'wall' },
            { x: 500, y: 400, w: 50, h: 50, type: 'wall' },
            { x: 700, y: 200, w: 50, h: 50, type: 'wall' },
            { x: 900, y: 350, w: 50, h: 50, type: 'wall' },
            { x: 1100, y: 150, w: 50, h: 50, type: 'wall' },
            { x: 600, y: 550, w: 50, h: 50, type: 'wall' },
            { x: 1200, y: 500, w: 50, h: 50, type: 'wall' },
            // Inimigos (Vermelhos)
            { x: 100, y: 20, w: 60, h: 60, type: 'enemy', speed: 2.5 },
            { x: 750, y: 500, w: 60, h: 60, type: 'enemy', speed: 3.5 }
        ];

        Game.minigame.collectibles = [
            { x: 50, y: 50 }, { x: 750, y: 300 }, { x: 250, y: 200 },
            { x: 100, y: 400 }, { x: 300, y: 200 }, { x: 600, y: 100 },
            { x: 200, y: 500 }, { x: 800, y: 250 }, { x: 350, y: 50 },
            { x: 500, y: 50 }
        ].map(p => ({ ...p, w: 20, h: 20, active: true }));
        
        Game.minigame.requiredScore = Game.minigame.collectibles.length;
    },

    startMaze: () => {
        Game.state = "GAME";
        AudioSys.playMusic('bgm-maze');
        document.getElementById("novel-layer").style.display = "none";
        document.getElementById("game-canvas").style.display = "block";

        Game.minigame.mode = "QUIZ";
        Game.minigame.player = { x: 415, y: 480, w: 40, h: 40, color: '#880afe', type: 'player' };
        Game.minigame.quizLevel = 0;
        Game.minigame.collectibles = [];

        // Portas do Quiz
        const doorY = 100;
        const doorSize = 80;
        Game.minigame.entities = [
            { x: 150, y: doorY, w: doorSize, h: doorSize, type: 'door', answerIndex: 0, color: '#8B4513' },
            { x: 400, y: doorY, w: doorSize, h: doorSize, type: 'door', answerIndex: 1, color: '#8B4513' },
            { x: 650, y: doorY, w: doorSize, h: doorSize, type: 'door', answerIndex: 2, color: '#8B4513' }
        ];
    }
};



// --- 4. UTILITÁRIOS E INIT ---

const Input = {
    keys: {},
    init: () => {
        window.addEventListener("keydown", e => {
            if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
                e.preventDefault(); // Impede rolar a tela
            }
            Input.keys[e.key] = true;
        });
        window.addEventListener("keyup", e => Input.keys[e.key] = false);
    }
};

const AudioSys = {
    currentTrackId: null,
    playMusic: (id) => {
        if (AudioSys.currentTrackId === id) return;
        ['bgm-main', 'bgm-minigame', 'bgm-maze'].forEach(mid => {
            const el = document.getElementById(mid);
            if(el) { el.pause(); el.currentTime = 0; }
        });
        const target = document.getElementById(id);
        if(target) {
            target.volume = 0.5;
            target.play().catch(e => console.log("Audio waiting interaction"));
            AudioSys.currentTrackId = id;
        }
    },
    playSFX: (id) => {
        const el = document.getElementById(id);
        if(el) { el.currentTime = 0; el.play().catch(e => {}); }
    }
};

const AssetLoader = {
    total: 0, loaded: 0,
    sources: [...Object.values(Assets.chars), ...Object.values(Assets.bg)],
    start: () => {
        AssetLoader.total = AssetLoader.sources.length;
        if (AssetLoader.total === 0) { AssetLoader.finish(); return; }
        AssetLoader.sources.forEach(src => {
            const img = new Image();
            img.onload = AssetLoader.progress;
            img.onerror = AssetLoader.progress;
            img.src = src;
        });
    },
    progress: () => {
        AssetLoader.loaded++;
        const pct = Math.floor((AssetLoader.loaded / AssetLoader.total) * 100);
        const txt = document.getElementById('loading-text');
        if(txt) txt.innerText = `Carregando... ${pct}%`;
        if (AssetLoader.loaded >= AssetLoader.total) AssetLoader.finish();
    },
    finish: () => {
        setTimeout(() => {
            document.getElementById('loading-state').style.display = 'none';
            document.getElementById('start-state').style.display = 'block';
        }, 500);
    }
};

window.onload = () => {
    Game.canvas = document.getElementById("game-canvas");
    Game.ctx = Game.canvas.getContext("2d");
    Input.init();
    AssetLoader.start();

    document.getElementById('btn-start').onclick = () => {
        const screen = document.getElementById('loading-screen');
        screen.style.transition = "opacity 1s ease";
        screen.style.opacity = 0;
        setTimeout(() => {
            screen.style.display = 'none';
            Engine.loadScene("inicio");
            // INICIA O LOOP PRINCIPAL
            requestAnimationFrame(Engine.gameLoop);
        }, 1000);
    };
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

        // 1. Limites da Tela (Player não pode sair)
        if (nextX >= 0 && nextX + player.w <= width) player.x = nextX;
        if (nextY >= 0 && nextY + player.h <= height) player.y = nextY;

        // 2. Colisão com ENTIDADES
        Game.minigame.entities.forEach(ent => {
            if (CheckCollision(player, ent)) {
                
                // --- REGRA UNIVERSAL DE PAREDE (Vale pra Arena e Quiz se tiver paredes) ---
                if (ent.type === 'wall') {
                    // Reverte o movimento (colisão sólida)
                    player.x -= dx;
                    player.y -= dy;
                }

                // --- REGRAS DA ARENA (AdCoffee) ---
                else if (Game.minigame.mode === 'ARENA') {
                    if (ent.type === 'enemy') {
                        AudioSys.playSFX('sfx-lose');
                        Engine.loadScene('ad_lose');
                    }
                }
                
                // --- REGRAS DO QUIZ (Portas) ---
                else if (Game.minigame.mode === 'QUIZ') {
                    if (ent.type === 'door') {
                        const currentQ = QuizData[Game.minigame.quizLevel];
                        
                        // Verifica resposta
                        if (ent.answerIndex === currentQ.correta) {
                            // ACERTOU
                            AudioSys.playSFX('sfx-collect');
                            Game.minigame.quizLevel++;

                            // Checa vitória
                            if (Game.minigame.quizLevel >= QuizData.length) {
                                Engine.loadScene('gw_win');
                            } else {
                                // Reseta posição para próxima pergunta
                                player.x = 415;
                                player.y = 480;
                            }
                        } else {
                            // ERROU
                            AudioSys.playSFX('sfx-lose');
                            Engine.loadScene('gw_lose');
                        }
                    }
                    else if (ent.type === 'spike') {
                         Engine.loadScene('gw_lose');
                    }
                }
            }

            // 3. MOVIMENTO DO INIMIGO (SÓ NA ARENA)
            // Se for inimigo e estiver na Arena, ele persegue
            if (ent.type === 'enemy' && Game.minigame.mode === 'ARENA') {
                const diffX = player.x - ent.x;
                const diffY = player.y - ent.y;
                const dist = Math.sqrt(diffX*diffX + diffY*diffY);
                
                // Persegue se estiver a uma certa distância (não gruda)
                if (dist > 10) { 
                    ent.x += (diffX / dist) * ent.speed;
                    ent.y += (diffY / dist) * ent.speed;
                }
            }
        });

        // 4. COLETÁVEIS (SÓ NA ARENA)
        let collectedCount = 0;
        if (Game.minigame.mode === 'ARENA') {
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
            // Vitória na Arena
            if (collectedCount >= Game.minigame.requiredScore) {
                Engine.loadScene('ad_win');
            }
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
        
        // 1. FUNDO (Muda a cor dependendo do jogo)
        ctx.fillStyle = Game.minigame.mode === 'ARENA' ? "#333" : "#222";
        ctx.fillRect(0, 0, Game.canvas.width, Game.canvas.height);

        // 2. TEXTO DA PERGUNTA (Apenas Modo Quiz)
        if (Game.minigame.mode === 'QUIZ') {
            const q = QuizData[Game.minigame.quizLevel];
            
            // Pergunta no topo
            ctx.fillStyle = "#fff";
            ctx.font = "bold 24px Arvo";
            ctx.textAlign = "center";
            ctx.fillText(q.pergunta, Game.canvas.width / 2, 60);

            // Instrução menor
            ctx.font = "16px Arvo";
            ctx.fillStyle = "#aaa";
            ctx.fillText("Escolha a porta correta:", Game.canvas.width / 2, 90);
        }

        // 3. ENTIDADES (Paredes, Portas, Inimigos)
        Game.minigame.entities.forEach(e => {
            
            // --- DESENHO DE PORTA (Quiz) ---
            if (e.type === 'door') {
                // A caixa da porta
                ctx.fillStyle = e.color || '#8B4513';
                ctx.fillRect(e.x, e.y, e.w, e.h);

                // Borda dourada
                ctx.strokeStyle = "#DAA520"; 
                ctx.lineWidth = 4;
                ctx.strokeRect(e.x, e.y, e.w, e.h);

                // TEXTO DENTRO DA CAIXA
                if (Game.minigame.mode === 'QUIZ') {
                    const q = QuizData[Game.minigame.quizLevel];
                    ctx.fillStyle = "#fff";
                    ctx.font = "bold 18px Arvo"; // Fonte um pouco menor pra caber
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle"; // Centraliza verticalmente
                    
                    // Desenha exatamente no meio do quadrado
                    ctx.fillText(q.opcoes[e.answerIndex], e.x + e.w/2, e.y + e.h/2);
                    
                    // Reseta baseline pra não atrapalhar outros textos
                    ctx.textBaseline = "alphabetic"; 
                }
            }
            
            // --- DESENHO DE PAREDE (Arena) ---
            else if (e.type === 'wall') {
                ctx.fillStyle = "#555"; // Cinza
                ctx.fillRect(e.x, e.y, e.w, e.h);
            }

            // --- DESENHO DE INIMIGO (Arena) ---
            else if (e.type === 'enemy') {
                // Tenta desenhar a imagem do BigC se existir, senão quadrado vermelho
                const img = document.getElementById('char-sprite'); // Improviso ou cor sólida
                ctx.fillStyle = "red";
                ctx.fillRect(e.x, e.y, e.w, e.h);
            }
            
            // --- DESENHO DE ESPINHOS (Opcional) ---
            else if (e.type === 'spike') {
                ctx.fillStyle = "#f00";
                ctx.fillRect(e.x, e.y, e.w, e.h);
            }
        });

        // 4. COLETÁVEIS (Apenas Modo Arena)
        if (Game.minigame.mode === 'ARENA') {
            ctx.fillStyle = "gold";
            Game.minigame.collectibles.forEach(c => {
                if (c.active) {
                    ctx.beginPath();
                    ctx.arc(c.x + c.w/2, c.y + c.h/2, c.w/2, 0, Math.PI*2);
                    ctx.fill();
                    // Brilho
                    ctx.strokeStyle = "white";
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });
        }

        // 5. JOGADOR
        const p = Game.minigame.player;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        
        // Reset final de segurança
        ctx.textAlign = "start"; 
    }
};

// --- 7. UTILITÁRIOS ---

const UI = {
    hideNovel: () => {
        document.getElementById("novel-layer").style.display = "none";
        document.getElementById("game-canvas").style.display = "block";
    }
};

