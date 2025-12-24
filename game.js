
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
    "kal_missao": { 
        bg: Assets.bg.reitoria, 
        char: "kalelfreira", 
        text: "Vou testar seu conhecimento. O Jubilômetro não pode chegar a 100%!", 
        choices: [{ text: "Começar Teste", action: "START_KAL_QUIZ" }] // Ação especial
    },
    "kal_jubilado": {
    bg: Assets.bg.gameover,
    char: "nobody",
    text: "JUBILADO! Você atingiu 100% no Jubilômetro. Tente novamente!",
    choices: [{ text: "Tentar Novamente", action: "START_KAL_QUIZ" }, 
              { text: "Voltar ao Início", next: "inicio" }]
},

    "kal_win": {
    bg: Assets.bg.resun,
    char: "kalelfreira",
    text: "Parabéns! Você dominou as normas sem ser jubilado! Isso merece um café especial.",
    choices: [{ text: "Pegar Café Especial", next: "end_cafe" },
              { text: "Voltar ao Início", next: "inicio" }]
},

    // ROTA ADCOFFEE (ARENA)
    "ad_intro": { bg: Assets.bg.adufs, char: "pinguitor", text: "Colete 10 broches e fuja do Big C!", choices: [{ text: "Vamos nessa!", action: "START_ARENA" }] },
    "ad_win": { bg: Assets.bg.adufs, char: "pinguitor", text: "Você venceu! O Café Lendário é seu.", choices: [{ text: "Pegar Café", next: "end_cafe" }] },
    "ad_lose": { bg: Assets.bg.adufs, char: "bigc", text: "O Big C te pegou! Mais sorte na próxima.", choices: [{ text: "Revanche", action: "START_ARENA" }, { text: "Desistir", next: "inicio" }] },

    // FINAIS
    "end_pergaminho": { bg: Assets.bg.pergaminho, char: "nobody", text: "Você obteve o PERGAMINHO DO PODEROSO DEV!", choices: [{ text: "Reiniciar", next: "inicio" }] },
    "end_cafe": { bg: Assets.bg.cafe, char: "nobody", text: "Você obteve o CAFÉ LENDÁRIO!", choices: [{ text: "Reiniciar", next: "inicio" }] }
};
// --- LÓGICA DO JUBILÔMETRO (Rota Kal-El) ---

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
    questionsQueue: [], // Fila de perguntas para não repetir
    
    start: () => {
        KalElSystem.meter = 0;
        
        // 1. SOLUÇÃO DA REPETIÇÃO E QUANTIDADE:
        // Cria uma cópia da lista NormasData e embaralha ela agora.
        KalElSystem.questionsQueue = [...NormasData].sort(() => Math.random() - 0.5);
        
        // OBS: Se quiser usar SÓ 5 perguntas aleatórias das 8, descomente a linha abaixo:
        // KalElSystem.questionsQueue = KalElSystem.questionsQueue.slice(0, 5);

        UI.showJubilometro(true);
        KalElSystem.updateDisplay();
        KalElSystem.showNextQuestion();
    },

    showNextQuestion: () => {
        // Verifica Derrota (Jubilado)
        if (KalElSystem.meter >= 100) {
            UI.showJubilometro(false);
            Engine.loadScene("kal_jubilado");
            return;
        }

        // 2. SOLUÇÃO DO FIM DE JOGO:
        // Verifica se a fila de perguntas acabou. Se sim, Vitória!
        if (KalElSystem.questionsQueue.length === 0) {
            UI.showJubilometro(false);
            Engine.loadScene("kal_win");
            return;
        }

        // 3. Tira a próxima pergunta da fila (o .pop() remove ela, então nunca repete)
        const q = KalElSystem.questionsQueue.pop();
        
        // Define o humor do avatar
        let avatar = "kalelfreira";
        if (KalElSystem.meter >= 30) avatar = "kalelfreiratriste";
        if (KalElSystem.meter >= 70) avatar = "kalelfreirabravo";

        // Mostra quantas faltam para acabar
        const total = NormasData.length; // Ou 5, se você usou o slice
        const atual = total - KalElSystem.questionsQueue.length;

        const sceneData = {
            bg: Assets.bg.reitoria,
            char: avatar,
            text: `(Pergunta ${atual}/${total}) - Risco: ${KalElSystem.meter}%\n\n${q.p}`,
            choices: q.r.map((resp, index) => ({
                text: resp,
                // Aqui garantimos que a ação processe a resposta dessa pergunta específica
                action: index === q.c ? "KAL_CORRECT" : "KAL_WRONG" 
            }))
        };

        Engine.injectScene(sceneData);
    },

    processAnswer: (isCorrect) => {
        if (isCorrect) {
            // Acertou: diminui o risco
            if (KalElSystem.meter > 0) {
                KalElSystem.meter = Math.max(0, KalElSystem.meter - 10);
            }
            AudioSys.playSFX('sfx-collect');
        } else {
            // Errou: aumenta o risco
            KalElSystem.meter += 25;
            AudioSys.playSFX('sfx-lose');
            Transition.screenShake(10, 300);
        }

        KalElSystem.updateDisplay();
        
        // 4. SOLUÇÃO DO LOOP:
        // Independente se acertou ou errou, chama a próxima pergunta da fila
        setTimeout(() => {
            KalElSystem.showNextQuestion();
        }, 800);
    },

    updateDisplay: () => {
        const fill = document.getElementById('jubilo-fill');
        const txt = document.getElementById('jubilo-pct');
        
        if (!fill || !txt) return;
        
        fill.style.width = `${Math.min(KalElSystem.meter, 100)}%`;
        
        if(KalElSystem.meter < 50) fill.style.background = "#4caf50"; 
        else if(KalElSystem.meter < 80) fill.style.background = "#ff9800"; 
        else fill.style.background = "#f44336"; 

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
                // CORREÇÃO AQUI: Usar 'else if' para encadear tudo
                if (c.action === "START_ARENA") Minigame.startArena();
                else if (c.action === "START_KAL_QUIZ") KalElSystem.start();
                else if (c.action === "START_MAZE") Minigame.startMaze();
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
    touch: {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        velocityX: 0,
        velocityY: 0
    },
    init: () => {
        // Controles de teclado
        window.addEventListener("keydown", e => {
            if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d","W","A","S","D"].indexOf(e.key) > -1) {
                e.preventDefault();
            }
            Input.keys[e.key] = true;
            Input.keys[e.key.toLowerCase()] = true;
        });
        window.addEventListener("keyup", e => {
            Input.keys[e.key] = false;
            Input.keys[e.key.toLowerCase()] = false;
        });

        // Controles de toque
        const canvas = document.getElementById("game-canvas");
        
        canvas.addEventListener("touchstart", (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            
            Input.touch.active = true;
            Input.touch.startX = touch.clientX - rect.left;
            Input.touch.startY = touch.clientY - rect.top;
            Input.touch.currentX = Input.touch.startX;
            Input.touch.currentY = Input.touch.startY;
            Input.touch.velocityX = 0;
            Input.touch.velocityY = 0;
            
            // Se estiver no modo Quiz, verifica se tocou diretamente em uma porta
            if (Game.minigame.mode === "QUIZ") {
                const touchX = Input.touch.startX;
                const touchY = Input.touch.startY;
                
                Game.minigame.entities.forEach(ent => {
                    if (ent.type === 'door') {
                        if (touchX >= ent.x && touchX <= ent.x + ent.w &&
                            touchY >= ent.y && touchY <= ent.y + ent.h) {
                            // Tocado diretamente na porta - processa imediatamente
                            const currentQ = QuizData[Game.minigame.quizLevel];
                            if (ent.answerIndex === currentQ.correta) {
                                // ACERTOU
                                AudioSys.playSFX('sfx-collect');
                                Game.minigame.quizLevel++;
                                
                                if (Game.minigame.quizLevel >= QuizData.length) {
                                    Engine.loadScene('gw_win');
                                } else {
                                    Game.minigame.player.x = 415;
                                    Game.minigame.player.y = 480;
                                }
                            } else {
                                // ERROU
                                AudioSys.playSFX('sfx-lose');
                                Engine.loadScene('gw_lose');
                            }
                        }
                    }
                });
            }
        }, { passive: false });

        canvas.addEventListener("touchmove", (e) => {
            e.preventDefault();
            if (!Input.touch.active) return;
            
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            
            Input.touch.currentX = touch.clientX - rect.left;
            Input.touch.currentY = touch.clientY - rect.top;
            
            // Calcula a velocidade para movimento suave
            Input.touch.velocityX = (Input.touch.currentX - Input.touch.startX) * 0.2;
            Input.touch.velocityY = (Input.touch.currentY - Input.touch.startY) * 0.2;
            
            // Move o jogador diretamente no toque (se não for modo Quiz com toque direto)
            if (Game.minigame.mode === "ARENA" || Game.minigame.mode === "QUIZ") {
                const player = Game.minigame.player;
                const newX = Input.touch.currentX - player.w/2;
                const newY = Input.touch.currentY - player.h/2;
                
                // Limita aos limites da tela
                player.x = Math.max(0, Math.min(Game.canvas.width - player.w, newX));
                player.y = Math.max(0, Math.min(Game.canvas.height - player.h, newY));
            }
        }, { passive: false });

        canvas.addEventListener("touchend", (e) => {
            e.preventDefault();
            Input.touch.active = false;
            Input.touch.velocityX = 0;
            Input.touch.velocityY = 0;
        }, { passive: false });

        // Também suporte a mouse para desktop (arrastar com mouse)
        canvas.addEventListener("mousedown", (e) => {
            const rect = canvas.getBoundingClientRect();
            
            Input.touch.active = true;
            Input.touch.startX = e.clientX - rect.left;
            Input.touch.startY = e.clientY - rect.top;
            Input.touch.currentX = Input.touch.startX;
            Input.touch.currentY = Input.touch.startY;
            
            // Verifica clique direto nas portas (modo Quiz)
            if (Game.minigame.mode === "QUIZ") {
                const clickX = Input.touch.startX;
                const clickY = Input.touch.startY;
                
                Game.minigame.entities.forEach(ent => {
                    if (ent.type === 'door') {
                        if (clickX >= ent.x && clickX <= ent.x + ent.w &&
                            clickY >= ent.y && clickY <= ent.y + ent.h) {
                            const currentQ = QuizData[Game.minigame.quizLevel];
                            if (ent.answerIndex === currentQ.correta) {
                                AudioSys.playSFX('sfx-collect');
                                Game.minigame.quizLevel++;
                                
                                if (Game.minigame.quizLevel >= QuizData.length) {
                                    Engine.loadScene('gw_win');
                                } else {
                                    Game.minigame.player.x = 415;
                                    Game.minigame.player.y = 480;
                                }
                            } else {
                                AudioSys.playSFX('sfx-lose');
                                Engine.loadScene('gw_lose');
                            }
                        }
                    }
                });
            }
        });

        canvas.addEventListener("mousemove", (e) => {
            if (!Input.touch.active) return;
            
            const rect = canvas.getBoundingClientRect();
            Input.touch.currentX = e.clientX - rect.left;
            Input.touch.currentY = e.clientY - rect.top;
            
            // Move o jogador com o mouse
            if (Game.minigame.mode === "ARENA" || Game.minigame.mode === "QUIZ") {
                const player = Game.minigame.player;
                const newX = Input.touch.currentX - player.w/2;
                const newY = Input.touch.currentY - player.h/2;
                
                player.x = Math.max(0, Math.min(Game.canvas.width - player.w, newX));
                player.y = Math.max(0, Math.min(Game.canvas.height - player.h, newY));
            }
        });

        canvas.addEventListener("mouseup", () => {
            Input.touch.active = false;
        });

        canvas.addEventListener("mouseleave", () => {
            Input.touch.active = false;
        });
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
    total: 0, 
    loaded: 0,
    
    start: () => {
        // 1. Lista de Imagens (Caminhos)
        const imgSources = [...Object.values(Assets.chars), ...Object.values(Assets.bg)];
        
        // 2. Lista de Áudios (Elementos HTML reais)
        const audioElements = Array.from(document.querySelectorAll('audio'));
        
        // Total de coisas para carregar
        AssetLoader.total = imgSources.length + audioElements.length;
        AssetLoader.loaded = 0;

        // Atualiza texto inicial
        AssetLoader.updateText();

        // Caso não tenha assets (prevenção de travamento)
        if (AssetLoader.total === 0) { 
            AssetLoader.finish(); 
            return; 
        }

        // --- A. CARREGAMENTO DE IMAGENS ---
        imgSources.forEach(src => {
            const img = new Image();
            // Importante: Definir os eventos ANTES do src
            img.onload = AssetLoader.progress;
            img.onerror = () => {
                console.warn(`Erro ao carregar imagem: ${src}`);
                AssetLoader.progress(); // Conta mesmo com erro pra não travar o jogo
            };
            img.src = src;
        });

        // --- B. CARREGAMENTO DE ÁUDIO (Onde geralmente demora) ---
        audioElements.forEach(audio => {
            // Verifica se o navegador já carregou o áudio (cache)
            if (audio.readyState >= 3) { // 3 = HAVE_FUTURE_DATA (suficiente para tocar)
                AssetLoader.progress();
            } else {
                // Se não carregou, adiciona ouvintes
                const onLoaded = () => {
                    audio.removeEventListener('canplaythrough', onLoaded);
                    audio.removeEventListener('error', onError);
                    AssetLoader.progress();
                };
                
                const onError = () => {
                    console.warn(`Erro ao carregar áudio: ${audio.src}`);
                    audio.removeEventListener('canplaythrough', onLoaded);
                    audio.removeEventListener('error', onError);
                    AssetLoader.progress();
                };

                audio.addEventListener('canplaythrough', onLoaded);
                audio.addEventListener('error', onError);
                
                // Força o navegador a buscar o áudio agora
                audio.load();
            }
        });
    },

    progress: () => {
        AssetLoader.loaded++;
        AssetLoader.updateText();
        
        if (AssetLoader.loaded >= AssetLoader.total) {
            AssetLoader.finish();
        }
    },
    
    updateText: () => {
        const pct = Math.floor((AssetLoader.loaded / AssetLoader.total) * 100);
        const txt = document.getElementById('loading-text');
        const bar = document.querySelector('.spinner'); // Opcional: se quiser animar algo
        
        if(txt) txt.innerText = `Carregando Assets... ${pct}%`;
    },

    finish: () => {
        // Pequeno delay proposital para o usuário ver o 100% (UX)
        setTimeout(() => {
            document.getElementById('loading-state').style.display = 'none';
            document.getElementById('start-state').style.display = 'block';
            console.log("Todos os assets carregados!");
        }, 500);
    }
};

window.onload = () => {
    
    Game.canvas = document.getElementById("game-canvas");
    Game.ctx = Game.canvas.getContext("2d");
    Input.init(); // Agora inicializa controles touch também
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

// --- 5. FÍSICA E COLISÃO ---

const Physics = {
    update: () => {
        const player = Game.minigame.player;
        let dx = 0; 
        let dy = 0;
        const speed = 5;

        // Controles de teclado (WASD e setas)
        if (Input.keys.ArrowUp || Input.keys.w || Input.keys.W) dy = -speed;
        if (Input.keys.ArrowDown || Input.keys.s || Input.keys.S) dy = speed;
        if (Input.keys.ArrowLeft || Input.keys.a || Input.keys.A) dx = -speed;
        if (Input.keys.ArrowRight || Input.keys.d || Input.keys.D) dx = speed;

        // Se estiver usando toque/mouse arrastando, usa o controle por toque
        // (O movimento por arrasto já é aplicado diretamente nos event listeners)
        // Para movimento por inércia após soltar o toque:
        if (!Input.touch.active && (Input.touch.velocityX !== 0 || Input.touch.velocityY !== 0)) {
            dx += Input.touch.velocityX;
            dy += Input.touch.velocityY;
            // Reduz a velocidade gradualmente
            Input.touch.velocityX *= 0.9;
            Input.touch.velocityY *= 0.9;
            if (Math.abs(Input.touch.velocityX) < 0.1) Input.touch.velocityX = 0;
            if (Math.abs(Input.touch.velocityY) < 0.1) Input.touch.velocityY = 0;
        }

        // Movimento Proposto (apenas para controles de teclado/inércia)
        const nextX = player.x + dx;
        const nextY = player.y + dy;
        const width = Game.canvas.width;
        const height = Game.canvas.height;

        // Aplica movimento dos controles de teclado/inércia
        if (dx !== 0 || dy !== 0) {
            if (nextX >= 0 && nextX + player.w <= width) player.x = nextX;
            if (nextY >= 0 && nextY + player.h <= height) player.y = nextY;
        }

        // Resto da função de colisão permanece igual...
        // 2. Colisão com ENTIDADES
        Game.minigame.entities.forEach(ent => {
            if (CheckCollision(player, ent)) {
                
                // --- REGRA UNIVERSAL DE PAREDE ---
                if (ent.type === 'wall') {
                    // Reverte o movimento (colisão sólida)
                    player.x -= dx;
                    player.y -= dy;
                    // Também para movimento por toque
                    if (Input.touch.active) {
                        // Empurra o jogador para fora da parede
                        const playerCenterX = player.x + player.w/2;
                        const playerCenterY = player.y + player.h/2;
                        const entCenterX = ent.x + ent.w/2;
                        const entCenterY = ent.y + ent.h/2;
                        
                        const diffX = playerCenterX - entCenterX;
                        const diffY = playerCenterY - entCenterY;
                        
                        if (Math.abs(diffX) > Math.abs(diffY)) {
                            // Colisão horizontal
                            if (diffX > 0) player.x = ent.x + ent.w;
                            else player.x = ent.x - player.w;
                        } else {
                            // Colisão vertical
                            if (diffY > 0) player.y = ent.y + ent.h;
                            else player.y = ent.y - player.h;
                        }
                    }
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
                                // Reseta a posição do jogador para o início IMEDIATAMENTE
                                Game.minigame.player.x = 415; // Posição X inicial (centro)
                                Game.minigame.player.y = 480; // Posição Y inicial (embaixo)
                                
                                // Zera qualquer movimento residual (importante para touch/inércia)
                                Input.touch.velocityX = 0;
                                Input.touch.velocityY = 0;
                                Input.touch.active = false; // Para de arrastar
                            }
                        } else {
                            // ERROU
                            AudioSys.playSFX('sfx-lose');
                            
                            // Opcional: Se errar, também reseta posição antes de mostrar a tela de erro
                            // Isso evita bugs visuais se ele clicar em "Tentar Novamente"
                            Game.minigame.player.x = 415;
                            Game.minigame.player.y = 480;
                            
                            Engine.loadScene('gw_lose');
                        }
                    }
                    else if (ent.type === 'spike') {
                        Engine.loadScene('gw_lose');
                    }
                }
            }
            // 3. MOVIMENTO DO INIMIGO (SÓ NA ARENA)
            if (ent.type === 'enemy' && Game.minigame.mode === 'ARENA') {
                const diffX = player.x - ent.x;
                const diffY = player.y - ent.y;
                const dist = Math.sqrt(diffX*diffX + diffY*diffY);
                
                // Persegue se estiver a uma certa distância
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
        
        // 1. FUNDO
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
            
            // Instrução para mobile (apenas se for tela pequena ou touch)
            if (window.innerWidth <= 768 || Input.touch.active) {
                ctx.font = "14px Arvo";
                ctx.fillStyle = "#4CAF50";
                ctx.fillText("Toque/Arraste o boneco ou clique nas portas", Game.canvas.width / 2, Game.canvas.height - 20);
            }
        }
        
        // 3. Instruções para Arena (mobile)
        if (Game.minigame.mode === 'ARENA' && (window.innerWidth <= 768 || Input.touch.active)) {
            ctx.font = "14px Arvo";
            ctx.fillStyle = "#4CAF50";
            ctx.textAlign = "center";
            ctx.fillText("Arraste o boneco para coletar os broches", Game.canvas.width / 2, Game.canvas.height - 20);
            ctx.fillText("Fuja dos inimigos vermelhos!", Game.canvas.width / 2, Game.canvas.height - 40);
        }

        // 4. ENTIDADES (Paredes, Portas, Inimigos) - Código existente...
        Game.minigame.entities.forEach(e => {
            
            if (e.type === 'door') {
                ctx.fillStyle = e.color || '#8B4513';
                ctx.fillRect(e.x, e.y, e.w, e.h);

                ctx.strokeStyle = "#DAA520"; 
                ctx.lineWidth = 4;
                ctx.strokeRect(e.x, e.y, e.w, e.h);

                if (Game.minigame.mode === 'QUIZ') {
                    const q = QuizData[Game.minigame.quizLevel];
                    ctx.fillStyle = "#fff";
                    ctx.font = "bold 18px Arvo";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    
                    ctx.fillText(q.opcoes[e.answerIndex], e.x + e.w/2, e.y + e.h/2);
                    
                    ctx.textBaseline = "alphabetic"; 
                }
            }
            
            else if (e.type === 'wall') {
                ctx.fillStyle = "#555";
                ctx.fillRect(e.x, e.y, e.w, e.h);
            }

            else if (e.type === 'enemy') {
                ctx.fillStyle = "red";
                ctx.fillRect(e.x, e.y, e.w, e.h);
            }
            
            else if (e.type === 'spike') {
                ctx.fillStyle = "#f00";
                ctx.fillRect(e.x, e.y, e.w, e.h);
            }
        });

        // 5. COLETÁVEIS (Apenas Modo Arena)
        if (Game.minigame.mode === 'ARENA') {
            ctx.fillStyle = "gold";
            Game.minigame.collectibles.forEach(c => {
                if (c.active) {
                    ctx.beginPath();
                    ctx.arc(c.x + c.w/2, c.y + c.h/2, c.w/2, 0, Math.PI*2);
                    ctx.fill();
                    ctx.strokeStyle = "white";
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });
        }

        // 6. JOGADOR
        const p = Game.minigame.player;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        
        // 7. Mostrar ponto de toque (apenas para debug, opcional)
        if (Input.touch.active) {
            ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
            ctx.beginPath();
            ctx.arc(Input.touch.currentX, Input.touch.currentY, 20, 0, Math.PI * 2);
            ctx.fill();
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

