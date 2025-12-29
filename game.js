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
    inventory: [],
    
    minigame: {
        mode: null, 
        player: { x: 0, y: 0, w: 50, h: 50, speed: 5, color: 'blue' },
        entities: [],
        collectibles: [],
        requiredScore: 0,
        quizLevel: 0
    }
};

// --- 2. ROTEIRO ---
const Scripts = {
    "inicio": { bg: Assets.bg.ufs, char: "pinguitor", text: "Olá! Seja bem-vindo ao DCOMP! Eu sou o Pinguitor. Escolha uma rota:", choices: [{ text: "A. Rota do Peregrino (Good Ways)", next: "gw_ola" }, { text: "B. Rota do Arauto (Kal-El)", next: "kal_ola" }, { text: "C. Rota do AdCoffee (Desafio)", next: "ad_intro" }] },

    // ROTA GOOD WAYS (QUIZ)
    "gw_ola": { bg: Assets.bg.resun, char: "goodways", text: "Dcomper, viva! Hoje te guiarei pelos bons caminhos!", choices: [{ text: "Quem é você?", next: "gw_intro" }] },
    "gw_intro": { bg: Assets.bg.resun, char: "goodways", text: "Sou Good Ways, professor do DCOMP e secretário da SBC!", choices: [{ text: "O que é SBC?", next: "gw_sbc" }] },
    "gw_sbc": { bg: Assets.bg.resun, char: "goodways", text: "Sociedade Brasileira de Computação! Contribuímos da formação aos eventos.", choices: [{ text: "Entendi. Vamos começar?", next: "gw_lab_intro" }] },
    "gw_lab_intro": { bg: Assets.bg.resun, char: "goodways", text: "Para ser um Dcomper, responda as perguntas corretamente nas portas!", choices: [{ text: "Estou pronto!", action: "START_MAZE" }] },
    "gw_win": { bg: Assets.bg.resun, char: "goodways", text: "Viva! Você concluiu a missão! Pegue sua recompensa.", choices: [{ text: "Pegar Pergaminho", action: "GET_REWARD_SCROLL" }] },
    "gw_lose": { bg: Assets.bg.gameover, char: "nobody", text: "VOCÊ ERROU A PORTA! Tentar de novo?", choices: [{ text: "Tentar Novamente", action: "START_MAZE" }, { text: "Voltar ao Início", next: "inicio" }] },

    // ROTA KAL-EL
    "kal_ola": { bg: Assets.bg.reitoria, char: "kalelfreira", text: "Olá! Sou Kal-El Freira. Vou lhe ensinar as normas!", choices: [{ text: "Normas?", next: "kal_selva" }] },
    "kal_selva": { bg: Assets.bg.reitoria, char: "kalelfreira", text: "A UFS é uma selva. As normas te protegem!", choices: [{ text: "Entendi", next: "kal_missao" }] },
    "kal_missao": { bg: Assets.bg.reitoria, char: "kalelfreira", text: "Vou testar seu conhecimento. O Jubilômetro não pode chegar a 100%!", choices: [{ text: "Começar Teste", action: "START_KAL_QUIZ" }] },
    "kal_jubilado": { bg: Assets.bg.gameover, char: "nobody", text: "JUBILADO! Você atingiu 100% no Jubilômetro. Tente novamente!", choices: [{ text: "Tentar Novamente", action: "START_KAL_QUIZ" }, { text: "Voltar ao Início", next: "inicio" }] },
    "kal_win": { bg: Assets.bg.resun, char: "kalelfreira", text: "Parabéns! Você dominou as normas sem ser jubilado! Isso merece um café especial.", choices: [{ text: "Pegar Café Especial", action: "GET_REWARD_CAFE" }] },

    // ROTA ADCOFFEE
    "ad_intro": { bg: Assets.bg.adufs, char: "pinguitor", text: "Colete 10 broches e fuja do Big C!", choices: [{ text: "Vamos nessa!", action: "START_ARENA" }] },
    "ad_win": { bg: Assets.bg.adufs, char: "pinguitor", text: "Você venceu! Tome este Café Lendário.", choices: [{ text: "Pegar Café", action: "GET_REWARD_CAFE" }] },
    "ad_lose": { bg: Assets.bg.adufs, char: "bigc", text: "O Big C te pegou! Mais sorte na próxima.", choices: [{ text: "Revanche", action: "START_ARENA" }, { text: "Desistir", next: "inicio" }] },

    // FINAIS
    "end_pergaminho": { bg: Assets.bg.pergaminho, char: "nobody", text: "Você obteve o PERGAMINHO DO PODEROSO DEV!", choices: [{ text: "Reiniciar", next: "inicio" }] },
    "end_cafe": { bg: Assets.bg.cafe, char: "nobody", text: "Você obteve o CAFÉ LENDÁRIO!", choices: [{ text: "Reiniciar", next: "inicio" }] }
};

// --- LÓGICA DO JUBILÔMETRO ---
const NormasData = [
    { p: "Qual o mínimo de frequência para passar?", r: ["75%", "50%", "100%"], c: 0 },
    { p: "Quantas reprovações jubilam por insuficiência?", r: ["3 reprovações", "4 reprovações", "2 reprovações"], c: 1 },
    { p: "O que é o IRA?", r: ["Índice de Rendimento Acadêmico", "Imposto de Renda Acadêmico", "Instituto Real de Aracaju"], c: 0 },
    { p: "Pode fazer prova de 2ª chamada quando?", r: ["Sempre que quiser", "Com atestado/justificativa", "Pagando taxa"], c: 1 },
    { p: "Quantos créditos optativos são necessários?", r: ["Zero", "Depende do curso", "Todos"], c: 1 },
    { p: "O que acontece se colar na prova?", r: ["Processo disciplinar", "Nada", "Ganha ponto"], c: 0 },
    { p: "Quem coordena o curso?", r: ["O Reitor", "O Colegiado", "O Centro Acadêmico"], c: 1 },
    { p: "Onde vejo minhas notas?", r: ["SIGAA", "Instagram", "Mural do corredor"], c: 0 }
];

const KalElSystem = {
    meter: 0,
    questionsQueue: [],
    scrollCharges: 0, // Variável para contar os usos restantes
    
    start: () => {
        KalElSystem.meter = 0;
        KalElSystem.questionsQueue = [...NormasData].sort(() => Math.random() - 0.5);
        
        // NERF: Se tiver o pergaminho, define apenas 3 cargas de proteção
        KalElSystem.scrollCharges = Game.inventory.includes('pergaminho') ? 3 : 0;
        
        UI.showJubilometro(true);
        KalElSystem.updateDisplay();
        KalElSystem.showNextQuestion();
    },

    showNextQuestion: () => {
        // Função auxiliar para consumir o item ao final do jogo (Vitória ou Derrota)
        const consumirPergaminhoFinal = () => {
            const idx = Game.inventory.indexOf('pergaminho');
            if (idx > -1) {
                Game.inventory.splice(idx, 1); // Remove do inventário
                if(window.atualizarHudInventario) window.atualizarHudInventario();
                console.log("O Pergaminho se desfez após o uso.");
            }
        };

        // DERROTA
        if (KalElSystem.meter >= 100) {
            UI.showJubilometro(false);
            consumirPergaminhoFinal(); // Item some
            Engine.loadScene("kal_jubilado");
            return;
        }

        // VITÓRIA
        if (KalElSystem.questionsQueue.length === 0) {
            UI.showJubilometro(false);
            consumirPergaminhoFinal(); // Item some
            Engine.loadScene("kal_win"); // Lá na cena 'kal_win' você pegará o Café
            return;
        }

        const q = KalElSystem.questionsQueue.pop();
        
        let avatar = "kalelfreira";
        if (KalElSystem.meter >= 30) avatar = "kalelfreiratriste";
        if (KalElSystem.meter >= 70) avatar = "kalelfreirabravo";

        const total = NormasData.length;
        const atual = total - KalElSystem.questionsQueue.length;

        // Texto dinâmico mostrando quantas cargas restam
        let avisoPergaminho = "";
        if (KalElSystem.scrollCharges > 0) {
            avisoPergaminho = `\n(📜 PERGAMINHO ATIVO: Proteção por mais ${KalElSystem.scrollCharges} perguntas)`;
        }

        const sceneData = {
            bg: Assets.bg.reitoria,
            char: avatar,
            text: `(Pergunta ${atual}/${total}) - Risco: ${KalElSystem.meter}%${avisoPergaminho}\n\n${q.p}`,
            choices: q.r.map((resp, index) => ({
                text: resp,
                action: index === q.c ? "KAL_CORRECT" : "KAL_WRONG" 
            }))
        };

        Engine.injectScene(sceneData);
    },

    processAnswer: (isCorrect) => {
        // Lógica de consumo: Passou uma pergunta, gasta uma carga (se tiver)
        let protegido = false;
        if (KalElSystem.scrollCharges > 0) {
            protegido = true;
            KalElSystem.scrollCharges--; 
        }

        if (isCorrect) {
            // Acertou: diminui risco (bônus normal)
            if (KalElSystem.meter > 0) {
                KalElSystem.meter = Math.max(0, KalElSystem.meter - 10);
            }
            AudioSys.playSFX('sfx-collect');
        } else {
            // Errou: Verifica se estava protegido naquela rodada
            if (protegido) {
                console.log("O Pergaminho impediu o Jubilômetro de subir!");
                // Não aumenta o meter, mas toca um som diferente se quiser
            } else {
                KalElSystem.meter += 25;
                AudioSys.playSFX('sfx-lose');
                Transition.screenShake(10, 300);
            }
        }

        KalElSystem.updateDisplay();
        
        setTimeout(() => {
            KalElSystem.showNextQuestion();
        }, 800);
    },

    updateDisplay: () => {
        const fill = document.getElementById('jubilo-fill');
        const txt = document.getElementById('jubilo-pct');
        
        if (!fill || !txt) return;
        
        fill.style.width = `${Math.min(KalElSystem.meter, 100)}%`;
        
        // Fica Azul Ciano enquanto tiver cargas do pergaminho
        if (KalElSystem.scrollCharges > 0) {
            fill.style.background = "#00bfff"; 
        } else {
            // Cores normais de perigo
            if(KalElSystem.meter < 50) fill.style.background = "#4caf50"; 
            else if(KalElSystem.meter < 80) fill.style.background = "#ff9800"; 
            else fill.style.background = "#f44336"; 
        }

        txt.innerText = `${KalElSystem.meter}%`;
    }
};

// --- 3. ENGINE E LOGICA ---

const Engine = {
    loadScene: (sceneId) => {
        Game.state = "NOVEL";
        AudioSys.playMusic('bgm-main');
        
        const scene = Scripts[sceneId];
        Game.currentScene = scene;

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

        const choicesDiv = document.getElementById("choices-container");
        choicesDiv.innerHTML = "";
        scene.choices.forEach(c => {
            const btn = document.createElement("button");
            btn.className = "choice-btn";
            btn.innerText = c.text;
            btn.onclick = () => {
                if (c.action === "START_ARENA") Minigame.startArena();
                else if (c.action === "START_KAL_QUIZ") KalElSystem.start();
                else if (c.action === "START_MAZE") Minigame.startMaze();
                
                // GANHAR CAFÉ (Venceu Arena OU Kal-El)
                else if (c.action === "GET_REWARD_CAFE") {
                    if (!Game.inventory.includes('cafe')) { // Evita duplicar se já tiver
                        Game.inventory.push('cafe'); 
                    }
                    if(window.atualizarHudInventario) window.atualizarHudInventario();
                    Engine.loadScene('end_cafe'); 
                }
                
                // GANHAR PERGAMINHO (Venceu Maze/Good Ways)
                else if (c.action === "GET_REWARD_SCROLL") {
                    if (!Game.inventory.includes('pergaminho')) {
                        Game.inventory.push('pergaminho');
                    }
                    if(window.atualizarHudInventario) window.atualizarHudInventario();
                    Engine.loadScene('end_pergaminho');
                }
                
                else Engine.loadScene(c.next);
            };
            choicesDiv.appendChild(btn);
        });
    },

    injectScene: (sceneData) => {
        Game.state = "NOVEL";
        Game.currentScene = sceneData;
        
        document.getElementById("novel-layer").style.display = "block";
        document.getElementById("game-canvas").style.display = "none";
        document.getElementById("background-layer").style.backgroundImage = `url('${sceneData.bg}')`;
        
        const charImg = document.getElementById("char-sprite");
        charImg.src = Assets.chars[sceneData.char];
        charImg.style.display = "block";
        
        document.getElementById("speaker-name").innerText = "KAL-EL FREIRA";
        document.getElementById("dialogue-text").innerText = sceneData.text;

        const choicesDiv = document.getElementById("choices-container");
        choicesDiv.innerHTML = "";
        sceneData.choices.forEach(c => {
            const btn = document.createElement("button");
            btn.className = "choice-btn";
            btn.innerText = c.text;
            btn.onclick = () => {
                if (c.action === "KAL_CORRECT") KalElSystem.processAnswer(true);
                else if (c.action === "KAL_WRONG") KalElSystem.processAnswer(false);
                else if (c.action === "START_ARENA") Minigame.startArena();
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
        
        // RESET COMPLETO PARA EVITAR BUGS DE MOVIMENTO
        Input.keys = {}; 
        Input.touch.active = false;
        Input.touch.velocityX = 0;
        Input.touch.velocityY = 0;
        Input.touch.currentX = 0;
        Input.touch.currentY = 0;

        Game.minigame.player = { x: 650, y: 300, w: 40, h: 40, color: 'cyan', type: 'player' };
        
        Game.minigame.entities = [
            { x: 100, y: 300, w: 50, h: 50, type: 'wall' },
            { x: 300, y: 100, w: 50, h: 50, type: 'wall' },
            { x: 500, y: 400, w: 50, h: 50, type: 'wall' },
            { x: 700, y: 200, w: 50, h: 50, type: 'wall' },
            { x: 900, y: 350, w: 50, h: 50, type: 'wall' },
            { x: 1100, y: 150, w: 50, h: 50, type: 'wall' },
            { x: 600, y: 550, w: 50, h: 50, type: 'wall' },
            { x: 1200, y: 500, w: 50, h: 50, type: 'wall' },
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
        
        // RESET COMPLETO PARA EVITAR TELA PRETA NO RESTART
        Game.minigame.quizLevel = 0; 
        Game.minigame.collectibles = [];
        
        Game.minigame.player = { x: 415, y: 480, w: 40, h: 40, color: '#880afe', type: 'player' };
        Input.keys = {}; 
        Input.touch.active = false;
        Input.touch.velocityX = 0;
        Input.touch.velocityY = 0;

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
    touch: {
        active: false,
        startX: 0, startY: 0,
        currentX: 0, currentY: 0,
        velocityX: 0, velocityY: 0
    },
    init: () => {
        // Teclado
        window.addEventListener("keydown", e => {
            if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"].indexOf(e.key.toLowerCase()) > -1) e.preventDefault();
            Input.keys[e.key] = true;
            Input.keys[e.key.toLowerCase()] = true;
        });
        window.addEventListener("keyup", e => {
            Input.keys[e.key] = false;
            Input.keys[e.key.toLowerCase()] = false;
        });

        // Touch e Mouse
        const canvas = document.getElementById("game-canvas");
        
        const handleStart = (x, y) => {
            Input.touch.active = true;
            const rect = canvas.getBoundingClientRect();
            Input.touch.startX = x - rect.left;
            Input.touch.startY = y - rect.top;
            Input.touch.currentX = Input.touch.startX;
            Input.touch.currentY = Input.touch.startY;
            Input.touch.velocityX = 0;
            Input.touch.velocityY = 0;

            // Lógica de clique nas portas (Quiz)
            if (Game.minigame.mode === "QUIZ") {
                const touchX = Input.touch.startX;
                const touchY = Input.touch.startY;
                Game.minigame.entities.forEach(ent => {
                    if (ent.type === 'door') {
                        if (touchX >= ent.x && touchX <= ent.x + ent.w && touchY >= ent.y && touchY <= ent.y + ent.h) {
                            const currentQ = QuizData[Game.minigame.quizLevel];
                            if (ent.answerIndex === currentQ.correta) {
                                AudioSys.playSFX('sfx-collect');
                                Game.minigame.quizLevel++;
                                if (Game.minigame.quizLevel >= QuizData.length) Engine.loadScene('gw_win');
                                else { Game.minigame.player.x = 415; Game.minigame.player.y = 480; }
                            } else {
                                AudioSys.playSFX('sfx-lose');
                                Engine.loadScene('gw_lose');
                            }
                        }
                    }
                });
            }
        };

        canvas.addEventListener("touchstart", (e) => { e.preventDefault(); handleStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
        canvas.addEventListener("mousedown", (e) => { handleStart(e.clientX, e.clientY); });

        const handleMove = (x, y) => {
            if (!Input.touch.active) return;
            const rect = canvas.getBoundingClientRect();
            Input.touch.currentX = x - rect.left;
            Input.touch.currentY = y - rect.top;
            
            Input.touch.velocityX = (Input.touch.currentX - Input.touch.startX) * 0.2;
            Input.touch.velocityY = (Input.touch.currentY - Input.touch.startY) * 0.2;
            
            if (Game.minigame.mode === "ARENA" || Game.minigame.mode === "QUIZ") {
                const player = Game.minigame.player;
                const newX = Input.touch.currentX - player.w/2;
                const newY = Input.touch.currentY - player.h/2;
                player.x = Math.max(0, Math.min(Game.canvas.width - player.w, newX));
                player.y = Math.max(0, Math.min(Game.canvas.height - player.h, newY));
            }
        };

        canvas.addEventListener("touchmove", (e) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
        canvas.addEventListener("mousemove", (e) => { handleMove(e.clientX, e.clientY); });

        const handleEnd = () => { Input.touch.active = false; };
        canvas.addEventListener("touchend", (e) => { e.preventDefault(); handleEnd(); }, { passive: false });
        canvas.addEventListener("mouseup", handleEnd);
        canvas.addEventListener("mouseleave", handleEnd);
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

document.addEventListener("visibilitychange", () => {
    if (AudioSys.currentTrackId) {
        const audioEl = document.getElementById(AudioSys.currentTrackId);
        if (audioEl) {
            if (document.hidden) {
                audioEl.pause();
                console.log("Aba oculta: Música pausada.");
            } else {
                audioEl.play().catch(e => {});
                console.log("Aba visível: Música retomada.");
            }
        }
    }
});

const AssetLoader = {
    total: 0, loaded: 0,
    start: () => {
        const imgSources = [...Object.values(Assets.chars), ...Object.values(Assets.bg)];
        const audioElements = Array.from(document.querySelectorAll('audio'));
        AssetLoader.total = imgSources.length + audioElements.length;
        AssetLoader.loaded = 0;
        AssetLoader.updateText();

        if (AssetLoader.total === 0) { AssetLoader.finish(); return; }

        imgSources.forEach(src => {
            const img = new Image();
            img.onload = AssetLoader.progress;
            img.onerror = () => { console.warn(`Erro img: ${src}`); AssetLoader.progress(); };
            img.src = src;
        });

        audioElements.forEach(audio => {
            if (audio.readyState >= 3) AssetLoader.progress();
            else {
                const onLoaded = () => {
                    audio.removeEventListener('canplaythrough', onLoaded);
                    audio.removeEventListener('error', onError);
                    AssetLoader.progress();
                };
                const onError = () => {
                    console.warn(`Erro audio: ${audio.src}`);
                    audio.removeEventListener('canplaythrough', onLoaded);
                    audio.removeEventListener('error', onError);
                    AssetLoader.progress();
                };
                audio.addEventListener('canplaythrough', onLoaded);
                audio.addEventListener('error', onError);
                audio.load();
            }
        });
    },
    progress: () => {
        AssetLoader.loaded++;
        AssetLoader.updateText();
        if (AssetLoader.loaded >= AssetLoader.total) AssetLoader.finish();
    },
    updateText: () => {
        const pct = Math.floor((AssetLoader.loaded / AssetLoader.total) * 100);
        const txt = document.getElementById('loading-text');
        if(txt) txt.innerText = `Carregando Assets... ${pct}%`;
    },
    finish: () => {
        setTimeout(() => {
            document.getElementById('loading-state').style.display = 'none';
            document.getElementById('start-state').style.display = 'block';
            console.log("Todos os assets carregados!");
        }, 500);
    }
};

window.onload = () => {
    document.getElementById('btn-force-mobile').onclick = () => {
        document.getElementById('mobile-warning').style.display = 'none';
    };
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
            requestAnimationFrame(Engine.gameLoop);
        }, 1000);
    };
};

const CoffeeBreakSystem = {
    isActive: false,
    
    // Verifica se pode reviver
    tryRevive: (callbackAfterRevive) => {
        const index = (Game.inventory || []).indexOf('cafe');
        
        if (index > -1) {
            // Consome o item
            Game.inventory.splice(index, 1); 
            if(window.atualizarHudInventario) window.atualizarHudInventario(); 

            CoffeeBreakSystem.triggerEffect(callbackAfterRevive);
            return true; // Reviveu com sucesso
        }
        return false; // Morreu de verdade
    },

    triggerEffect: (callback) => {
        CoffeeBreakSystem.isActive = true;
        const overlay = document.getElementById('coffee-break-overlay');
        const text = document.getElementById('coffee-break-text');
        
        // Toca som se tiver
        // AudioSys.playSFX('sfx-powerup'); 

        overlay.style.display = 'flex';
        
        // Reinicia animação do texto
        text.style.animation = 'none';
        text.offsetHeight; /* trigger reflow */
        text.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';

        // --- EMPURRAR INIMIGOS (PUSH BACK) ---
        // Empurra os inimigos uma única vez quando ativa
        if (Game.minigame.entities) {
            Game.minigame.entities.forEach(ent => {
                if(ent.type === 'enemy') {
                    // Calcula a direção para empurrar
                    const dx = ent.x - Game.minigame.player.x;
                    const dy = ent.y - Game.minigame.player.y;
                    
                    // Empurra 150 pixels para longe
                    // Se dx for positivo (inimigo à direita), empurra +150, senão -150
                    ent.x += (dx >= 0 ? 150 : -150);
                    ent.y += (dy >= 0 ? 150 : -150);
                    
                    // Garante que não empurrou para fora do mapa (Opcional, mas bom para evitar bugs)
                    ent.x = Math.max(50, Math.min(800, ent.x));
                    ent.y = Math.max(50, Math.min(500, ent.y));
                }
            });
        }

        setTimeout(() => {
            overlay.style.display = 'none';
            CoffeeBreakSystem.isActive = false;
            
            // Dá 2 segundos de invencibilidade APÓS a tela sair
            Game.minigame.player.invincible = true;
            setTimeout(() => { Game.minigame.player.invincible = false; }, 2000);

            if (callback) callback();
        }, 2500); // O efeito dura 2.5 segundos
    }
};

// --- 5. FÍSICA E COLISÃO ---

const Physics = {
    update: () => {
        // --- PAUSA A FÍSICA SE O COFFEE BREAK ESTIVER ATIVO ---
        if (CoffeeBreakSystem.isActive) return;

        const player = Game.minigame.player;
        let dx = 0, dy = 0;
        const speed = 5;

        // Movimentação
        if (Input.keys.ArrowUp || Input.keys.w) dy = -speed;
        if (Input.keys.ArrowDown || Input.keys.s) dy = speed;
        if (Input.keys.ArrowLeft || Input.keys.a) dx = -speed;
        if (Input.keys.ArrowRight || Input.keys.d) dx = speed;

        // Touch
        if (!Input.touch.active && (Input.touch.velocityX !== 0 || Input.touch.velocityY !== 0)) {
            dx += Input.touch.velocityX;
            dy += Input.touch.velocityY;
            Input.touch.velocityX *= 0.9;
            Input.touch.velocityY *= 0.9;
            if (Math.abs(Input.touch.velocityX) < 0.1) Input.touch.velocityX = 0;
            if (Math.abs(Input.touch.velocityY) < 0.1) Input.touch.velocityY = 0;
        }

        const nextX = player.x + dx;
        const nextY = player.y + dy;
        const width = Game.canvas.width;
        const height = Game.canvas.height;

        if (dx !== 0 || dy !== 0) {
            if (nextX >= 0 && nextX + player.w <= width) player.x = nextX;
            if (nextY >= 0 && nextY + player.h <= height) player.y = nextY;
        }

        // --- COLISÕES ---
        Game.minigame.entities.forEach(ent => {
            if (CheckCollision(player, ent)) {
                if (ent.type === 'wall') {
                    player.x -= dx;
                    player.y -= dy;
                    if (Input.touch.active) {
                        const pcX = player.x + player.w/2, pcY = player.y + player.h/2;
                        const ecX = ent.x + ent.w/2, ecY = ent.y + ent.h/2;
                        if (Math.abs(pcX - ecX) > Math.abs(pcY - ecY)) {
                            if (pcX - ecX > 0) player.x = ent.x + ent.w; else player.x = ent.x - player.w;
                        } else {
                            if (pcY - ecY > 0) player.y = ent.y + ent.h; else player.y = ent.y - player.h;
                        }
                    }
                } 
                
                // --- COLISÃO COM INIMIGO (ARENA) ---
                else if (Game.minigame.mode === 'ARENA') {
                    if (ent.type === 'enemy') {
                        // Se não está invencível E o sistema não está ativo
                        if (!player.invincible && !CoffeeBreakSystem.isActive) {
                            const revived = CoffeeBreakSystem.tryRevive(() => {
                                console.log("Ressuscitou!");
                            });
                            
                            // Se não tiver café, morre
                            if (!revived) {
                                AudioSys.playSFX('sfx-lose');
                                Engine.loadScene('ad_lose');
                            }
                        }
                    }
                } 
                
                // --- COLISÃO NO QUIZ ---
                else if (Game.minigame.mode === 'QUIZ') {
                    if (ent.type === 'door') {
                        const currentQ = QuizData[Game.minigame.quizLevel];
                        if (ent.answerIndex === currentQ.correta) {
                            AudioSys.playSFX('sfx-collect');
                            Game.minigame.quizLevel++;
                            if (Game.minigame.quizLevel >= QuizData.length) Engine.loadScene('gw_win');
                            else {
                                Game.minigame.player.x = 415;
                                Game.minigame.player.y = 480;
                                Input.touch.velocityX = 0; Input.touch.velocityY = 0; Input.touch.active = false;
                            }
                        } else {
                            // Errou a porta
                            if (!player.invincible) {
                                const revived = CoffeeBreakSystem.tryRevive(() => {
                                    player.y += 100; // Recua
                                });

                                if (!revived) {
                                    AudioSys.playSFX('sfx-lose');
                                    Game.minigame.player.x = 415;
                                    Game.minigame.player.y = 480;
                                    Engine.loadScene('gw_lose');
                                }
                            }
                        }
                    } else if (ent.type === 'spike') {
                        Engine.loadScene('gw_lose');
                    }
                }
            }
            
            // IA Inimigo (Só move se o Coffee Break NÃO estiver ativo)
            if (ent.type === 'enemy' && Game.minigame.mode === 'ARENA') {
                const dx = player.x - ent.x, dy = player.y - ent.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 10) { ent.x += (dx/dist)*ent.speed; ent.y += (dy/dist)*ent.speed; }
            }
        });

        // Coletáveis
        let collectedCount = 0;
        if (Game.minigame.mode === 'ARENA') {
            Game.minigame.collectibles.forEach(c => {
                if (c.active) {
                    if (CheckCollision(player, c)) { c.active = false; AudioSys.playSFX('sfx-collect'); }
                } else collectedCount++;
            });
            if (collectedCount >= Game.minigame.requiredScore) Engine.loadScene('ad_win');
        }
    }
};
const CheckCollision = (r1, r2) => (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);

// --- 6. RENDERIZAÇÃO ---

const Renderer = {
    draw: () => {
        const ctx = Game.ctx;
        ctx.fillStyle = Game.minigame.mode === 'ARENA' ? "#333" : "#222";
        ctx.fillRect(0, 0, Game.canvas.width, Game.canvas.height);

        // Desenha Texto do Quiz e Arena (igual ao anterior)
        if (Game.minigame.mode === 'QUIZ') {
            const q = QuizData[Game.minigame.quizLevel];
            if (!q) return; 
            ctx.fillStyle = "#fff"; ctx.font = "bold 24px Arvo"; ctx.textAlign = "center";
            ctx.fillText(q.pergunta, Game.canvas.width / 2, 60);
            ctx.font = "16px Arvo"; ctx.fillStyle = "#aaa";
            ctx.fillText("Escolha a porta correta:", Game.canvas.width / 2, 90);
        }
        
        if (Game.minigame.mode === 'ARENA' && (window.innerWidth <= 768 || Input.touch.active)) {
            ctx.font = "14px Arvo"; ctx.fillStyle = "#4CAF50"; ctx.textAlign = "center";
            ctx.fillText("Arraste o boneco para coletar os broches", Game.canvas.width / 2, Game.canvas.height - 20);
            ctx.fillText("Fuja dos inimigos vermelhos!", Game.canvas.width / 2, Game.canvas.height - 40);
        }

        // Desenha Entidades (Portas, Paredes, Inimigos)
        Game.minigame.entities.forEach(e => {
            if (e.type === 'door') {
                ctx.fillStyle = e.color || '#8B4513'; ctx.fillRect(e.x, e.y, e.w, e.h);
                ctx.strokeStyle = "#DAA520"; ctx.lineWidth = 4; ctx.strokeRect(e.x, e.y, e.w, e.h);
                if (Game.minigame.mode === 'QUIZ') {
                    const q = QuizData[Game.minigame.quizLevel];
                    ctx.fillStyle = "#fff"; ctx.font = "bold 18px Arvo"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    ctx.fillText(q.opcoes[e.answerIndex], e.x + e.w/2, e.y + e.h/2);
                    ctx.textBaseline = "alphabetic"; 
                }
            } else if (e.type === 'wall') {
                ctx.fillStyle = "#555"; ctx.fillRect(e.x, e.y, e.w, e.h);
            } else if (e.type === 'enemy') {
                ctx.fillStyle = "red"; ctx.fillRect(e.x, e.y, e.w, e.h);
            } else if (e.type === 'spike') {
                ctx.fillStyle = "#f00"; ctx.fillRect(e.x, e.y, e.w, e.h);
            }
        });

        // Desenha Coletáveis
        if (Game.minigame.mode === 'ARENA') {
            ctx.fillStyle = "gold";
            Game.minigame.collectibles.forEach(c => {
                if (c.active) {
                    ctx.beginPath(); ctx.arc(c.x + c.w/2, c.y + c.h/2, c.w/2, 0, Math.PI*2);
                    ctx.fill(); ctx.strokeStyle = "white"; ctx.lineWidth = 1; ctx.stroke();
                }
            });
        }

        // --- DESENHA O JOGADOR (COM EFEITO DE PISCAR) ---
        const p = Game.minigame.player;
        
        // Se estiver invencível, fica transparente piscando
        if (p.invincible) {
            if (Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.globalAlpha = 0.5;
            }
        }

        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        
        ctx.globalAlpha = 1.0; // Restaura a opacidade para o resto do desenho

        if (Input.touch.active) {
            ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
            ctx.beginPath(); ctx.arc(Input.touch.currentX, Input.touch.currentY, 20, 0, Math.PI * 2); ctx.fill();
        }
        ctx.textAlign = "start"; 
    }
};

// --- 7. UTILITÁRIOS ---

const UI = {
    hideNovel: () => {
        document.getElementById("novel-layer").style.display = "none";
        document.getElementById("game-canvas").style.display = "block";
    },
    showJubilometro: (show) => {
        document.getElementById('jubilometro-container').style.display = show ? 'flex' : 'none';
    }
};

window.atualizarHudInventario = () => {
    const box = document.getElementById('inventory-box');
    if (!box) return; 

    box.innerHTML = ''; 

    Game.inventory.forEach(item => {
        const divItem = document.createElement('div');
        divItem.className = 'inv-item';
        
        if(item === 'cafe') {
            divItem.innerHTML = '☕'; 
            divItem.title = "Café: Vida Extra na Arena/Quiz";
        } else if (item === 'pergaminho') {
            divItem.innerHTML = '📜'; 
            divItem.title = "Pergaminho: Congela o Jubilômetro";
        }
        
        box.appendChild(divItem);
    });

    // Esconde se vazio
    box.style.display = Game.inventory.length === 0 ? 'none' : 'flex';
};