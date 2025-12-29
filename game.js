/* --- game.js - VERSÃO FINAL CORRIGIDA & MELHORADA --- */

// --- 0. EFEITOS VISUAIS E UTILITÁRIOS ---
function createSnow() {
    const c = document.getElementById('snow-container');
    if(!c) return;
    const count = 30; // Reduzido levemente para performance
    for (let i = 0; i < count; i++) {
        const f = document.createElement('div');
        f.className = 'snowflake'; f.innerHTML = '❄';
        f.style.left = Math.random() * 100 + 'vw';
        f.style.animationDuration = (Math.random() * 3 + 2) + 's';
        f.style.fontSize = (Math.random() * 10 + 10) + 'px';
        c.appendChild(f);
        f.addEventListener('animationiteration', () => f.style.left = Math.random() * 100 + 'vw');
    }
}

const AudioSys = {
    currentTrackId: null,
    init: () => { new Audio().play().catch(()=>{}); }, 
    playMusic: (id) => {
        if (AudioSys.currentTrackId === id) {
            const el = document.getElementById(id);
            if (el && el.paused) el.play().catch(()=>{});
            return;
        }
        ['bgm-main', 'bgm-minigame', 'bgm-maze'].forEach(m => {
            const e = document.getElementById(m);
            if(e) { 
                // Fade out simples antes de parar
                let vol = e.volume;
                const fade = setInterval(() => {
                    if(vol > 0.05) { vol -= 0.05; e.volume = vol; }
                    else { clearInterval(fade); e.pause(); e.currentTime = 0; }
                }, 50);
            }
        });
        const t = document.getElementById(id);
        if(t) {
            t.volume = 0.4;
            t.play().catch(() => console.warn("Autoplay bloqueado pelo navegador"));
            AudioSys.currentTrackId = id;
        }
    },
    playSFX: (id) => {
        const el = document.getElementById(id);
        if(el) { el.currentTime = 0; el.volume = 0.6; el.play().catch(()=>{}); }
    }
};

document.addEventListener("visibilitychange", () => {
    const a = document.getElementById(AudioSys.currentTrackId);
    if (a) document.hidden ? a.pause() : a.play().catch(()=>{});
});

// --- 1. DADOS E ASSETS ---
const Assets = {
    chars: {
        'pinguitor': 'assets/pinguitor.png', 'goodways': 'assets/goodways.png',
        'kalelfreira': 'assets/kal-elfeliz.png', 'kalelfreirabravo': 'assets/kal-elbravo.png',
        'kalelfreatriste': 'assets/kal-eltriste.png', 'bigctriste': 'assets/bigcarlos-triste.png',
        'bigcserio': 'assets/bigcarlos-bravo.png', 
        'nobody': 'assets/nobody.png'
    },
    bg: {
        'ufs': 'assets/fundo_ufs.jpg', 'resun': 'assets/ufs_resun.jpg',
        'reitoria': 'assets/ufs_reitoria.jpg', 'adufs': 'assets/ufs_adufs.jpg',
        'cafe': 'assets/fotocafe.jpg', 'pergaminho': 'assets/pergaminhododev.jpg',
        'gameover': 'assets/gameoverscreen.jpg'
    }
};

const QuizData = [
    { pergunta: "Qual a cor do céu?", opcoes: ["Verde", "Azul", "Roxo"], correta: 1 },
    { pergunta: "1 + 1 é igual a...?", opcoes: ["11", "2", "Batata"], correta: 1 },
    { pergunta: "Qual o melhor curso?", opcoes: ["Medicina", "Direito", "Comp"], correta: 2 },
    { pergunta: "O HTML é uma linguagem de...?", opcoes: ["Programação", "Marcação", "Estilização"], correta: 1 }
];

const NormasData = [
    { p: "Qual o mínimo de frequência para passar?", r: ["75%", "50%", "100%"], c: 0 },
    { p: "Quantas reprovações jubilam por insuficiência?", r: ["3", "4", "2"], c: 1 },
    { p: "O que é o IRA?", r: ["Índice de Rendimento Acadêmico", "Imposto de Renda", "Instituto Real"], c: 0 },
    { p: "Pode fazer prova de 2ª chamada quando?", r: ["Sempre", "Com atestado", "Pagando"], c: 1 },
    { p: "Quantos créditos optativos são necessários?", r: ["Zero", "Depende do curso", "Todos"], c: 1 },
    { p: "O que acontece se colar na prova?", r: ["Processo disciplinar", "Nada", "Ponto extra"], c: 0 },
    { p: "Quem coordena o curso?", r: ["Reitor", "Colegiado", "DCE"], c: 1 },
    { p: "Onde vejo minhas notas?", r: ["SIGAA", "Instagram", "Mural"], c: 0 }
];

// --- 2. ESTADO DO JOGO ---
const Game = {
    state: "LOADING", playerName: "Calouro", currentScene: null,
    canvas: null, ctx: null, inventory: [], wins: 0, losses: 0,
    minigame: {
        mode: null, player: { x: 0, y: 0, w: 50, h: 50, speed: 5, color: 'blue' },
        entities: [], collectibles: [], requiredScore: 0, quizLevel: 0
    }
};

// --- 3. ROTEIRO (SCRIPTS) ---
const Scripts = {
    "inicio": { bg: "black", char: "nobody", text: "O sol de São Cristóvão estala no asfalto... 12:50. O ônibus atrasou, mas a aula de Introdução é às 13h.", choices: [{ text: "Correr pro portão e colocar o crachá", next: "input_name" }] },
    "input_name": { bg: Assets.bg.ufs, char: "nobody", text: "Espera, preciso me identificar na portaria. O que diz no meu crachá mesmo?", special: "INPUT_NAME" },
    "ccet_intro": { bg: Assets.bg.ufs, char: "pinguitor", text: "Salve, {nome}! Bem-vindo ao DCOMP Simulator. Sou o Pinguitor, mascote da Atlética Bugados e serei seu guia nessa jornada.", choices: [{ text: "Prazer, Pinguitor!", next: "ccet_entities" }] },
    "ccet_entities": { bg: Assets.bg.ufs, char: "pinguitor", text: "O DCOMP é um universo! Temos a Atlética, a SofTeam (nossa EJ) e ligas de peso como Coretech, Innovation Hub, Ladata e a LAIA.", choices: [{ text: "É muita coisa pra processar...", next: "ccet_canon" }] },
    "ccet_canon": { bg: Assets.bg.ufs, char: "pinguitor", text: "Relaxa! Vamos explorar isso vivendo os EVENTOS CANÔNICOS do departamento. Por enquanto temos 3 missões liberadas, mas aguarde novidades em breve!", choices: [{ text: "Estou pronto pro desafio!", next: "ccet_hub" }] },
    "ccet_hub": { bg: Assets.bg.ufs, char: "pinguitor", text: "{nome}, escolha seu destino. Onde vamos começar a construir sua lenda? {stats}", choices: [{ text: "🏫 Resun (Good Ways)", next: "gw_ola", coords: { top: '30%', left: '15%' } }, { text: "🏛️ Reitoria (Kal-El)", next: "kal_ola", coords: { top: '30%', left: '50%' } }, { text: "☕ AdCoffee (Arena)", next: "ad_intro", coords: { top: '50%', left: '30%' } }] },

    "gw_ola": { bg: Assets.bg.resun, char: "goodways", text: "Olá {nome}! Pronto para os caminhos corretos?", choices: [{ text: "Sim, professor!", next: "gw_intro" }, { text: "Voltar", next: "ccet_hub" }] },
    "gw_intro": { bg: Assets.bg.resun, char: "goodways", text: "Responda corretamente nas portas!", choices: [{ text: "Estou pronto!", action: "START_MAZE" }] },
    "gw_win": { bg: Assets.bg.resun, char: "goodways", text: "Viva! Pegue sua recompensa.", choices: [{ text: "Pegar Pergaminho", action: "GET_REWARD_SCROLL" }] },
    "gw_lose": { bg: Assets.bg.gameover, char: "nobody", text: "ERROU A PORTA! Que pena...", choices: [{ text: "Tentar de novo", action: "START_MAZE" }, { text: "Sair (Registrar Derrota)", action: "REGISTER_LOSS_HUB" }] },
    
    "kal_ola": { bg: Assets.bg.reitoria, char: "kalelfreira", text: "Ei, {nome}! Antes de dar mais um passo... você leu o 'Manual de Sobrevivência' desta universidade?", choices: [{ text: "Manual? Que manual?", next: "kal_explicacao" }, { text: "Li por cima...", next: "kal_motivo" }] },
    "kal_explicacao": { bg: Assets.bg.reitoria, char: "kalelfreira", text: "Tô falando das Normas Acadêmicas! Elas definem seus direitos e deveres. Sem saber isso, você é um alvo fácil.", choices: [{ text: "Alvo de quê?", next: "kal_motivo" }] },
    "kal_motivo": { bg: Assets.bg.reitoria, char: "kalelfreira", text: "Da burocracia e do azar! As normas te ensinam a trancar matrícula e evitar o jubileu. Ignorar isso é pedir pro Jubilômetro explodir.", choices: [{ text: "O Jubilômetro é sério assim?", next: "kal_selva" }] },
    "kal_selva": { bg: Assets.bg.reitoria, char: "kalelfreira", text: "A UFS é uma selva. O Jubilômetro não perdoa amadores. Se chegar a 100%, é Game Over. Vamos ver se você dura um semestre?", choices: [{ text: "Encarar Teste de Fogo", action: "START_KAL_QUIZ" }, { text: "Preciso respirar antes", next: "kal_ola" }] },
    "kal_jubilado": { bg: Assets.bg.gameover, char: "nobody", text: "VOCÊ FOI JUBILADO! O sistema te engoliu. Tente estudar as normas antes de voltar.", choices: [{ text: "Tentar de novo", action: "START_KAL_QUIZ" }, { text: "Sair (Registrar Derrota)", action: "REGISTER_LOSS_HUB" }] },
    "kal_win": { bg: Assets.bg.resun, char: "kalelfreira", text: "Mandou bem! Dominou o básico para não rodar logo de cara. Tome isso, vai precisar de energia.", choices: [{ text: "Pegar Café Especial", action: "GET_REWARD_CAFE" }] },
    
    /* --- CORREÇÃO DO BLOCO ADCOFFEE --- */
    "ad_intro": { bg: Assets.bg.adufs, char: "pinguitor", text: "Psiu! Escute bem: a única forma de a máquina liberar o Café Lendário é usando o Broche da Aprovação. Sem ele, nada feito! Mas temos um problema...", choices: [{ text: "Que problema?", next: "ad_intro_part2" }] },
    "ad_intro_part2": { bg: Assets.bg.adufs, char: "bigcserio", text: "O problema sou EU! Acha que vai pegar café com esse broche que o Pinguitor te deu? Hahaha! Eu sinto cheiro de calouro a quilômetros! Quebrei o broche e soltei os Cães da Justiça. Tente coletar os cacos enquanto eu te moggo. Duvido você passar!", choices: [{ text: "Desviar dos Cães e Coletar!", action: "START_ARENA" }] },
    
    "ad_win": { bg: Assets.bg.adufs, char: "bigctriste", text: "Impossível... (suspiro). Meus cães não te alcançaram... e você remontou o broche na minha frente. Minha postura foi quebrada. O Café Lendário reconhece sua persistência. Pegue... você venceu.", choices: [{ text: "Pegar Café da Vitória", action: "GET_REWARD_CAFE" }] },
    "ad_lose": { bg: Assets.bg.adufs, char: "bigcserio", text: "Hahaha! Eu avisei! Você tem a movimentação de um calouro perdido. Meus Cães da Justiça te pegaram fácil. Saia do meu AdCoffee, você foi moggado com sucesso.", choices: [{ text: "Tentar Novamente", action: "START_ARENA" }, { text: "Aceitar Derrota e Sair", action: "REGISTER_LOSS_HUB" }] },
    
    "end_pergaminho": { bg: Assets.bg.pergaminho, char: "nobody", text: "Você obteve o PERGAMINHO! (Congela Jubilômetro por 3 turnos)", choices: [{ text: "Voltar ao CCET", next: "ccet_hub" }] },
    "end_cafe": { bg: Assets.bg.cafe, char: "nobody", text: "Você obteve o CAFÉ! (Vida Extra no AdCoffee e Maze)", choices: [{ text: "Voltar ao CCET", next: "ccet_hub" }] }
};

// --- 4. SISTEMAS DE JOGO ---
const KalElSystem = {
    meter: 0, questionsQueue: [], scrollCharges: 0,
    start: () => {
        KalElSystem.meter = 0;
        KalElSystem.questionsQueue = [...NormasData].sort(() => Math.random() - 0.5);
        // Conta pergaminhos no inventário e aplica o efeito (3 cargas por item)
        const qtd = Game.inventory.filter(i => i === 'pergaminho').length;
        KalElSystem.scrollCharges = qtd * 3; 
        
        UI.showJubilometro(true);
        KalElSystem.updateDisplay();
        KalElSystem.showNextQuestion();
    },
    showNextQuestion: () => {
        // Consome 1 pergaminho do inventário se o efeito acabar, apenas para visualização
        // (A lógica real de "gastar" o item já foi feita ao calcular as cargas)
        if (KalElSystem.meter >= 100) { UI.showJubilometro(false); Engine.loadScene("kal_jubilado"); return; }
        if (KalElSystem.questionsQueue.length === 0) { UI.showJubilometro(false); Engine.loadScene("kal_win"); return; }
        
        const q = KalElSystem.questionsQueue.pop();
        let avatar = "kalelfreira";
        if(KalElSystem.meter >= 30) avatar = "kalelfreatriste"; 
        if(KalElSystem.meter >= 70) avatar = "kalelfreirabravo";
        
        const aviso = KalElSystem.scrollCharges > 0 ? `\n(📜 PROTEÇÃO ATIVA: ${KalElSystem.scrollCharges}x)` : "";
        Engine.injectScene({
            bg: Assets.bg.reitoria, char: avatar,
            text: `Risco: ${KalElSystem.meter}%${aviso}\n\n${q.p}`,
            choices: q.r.map((r, i) => ({ text: r, action: i === q.c ? "KAL_CORRECT" : "KAL_WRONG" }))
        });
    },
    processAnswer: (isCorrect) => {
        let protected = false;
        
        if (isCorrect) {
            if(KalElSystem.meter > 0) KalElSystem.meter = Math.max(0, KalElSystem.meter - 10);
            // Reduz carga de proteção se usada corretamente? Não, só protege do erro.
        } else {
            if(KalElSystem.scrollCharges > 0) { 
                protected = true; 
                KalElSystem.scrollCharges--; 
            }
            
            if(!protected) {
                KalElSystem.meter += 25;
                AudioSys.playSFX('sfx-lose');
            }
        }
        KalElSystem.updateDisplay();
        setTimeout(KalElSystem.showNextQuestion, 800);
    },
    updateDisplay: () => {
        const f = document.getElementById('jubilo-fill'), t = document.getElementById('jubilo-pct');
        if(!f || !t) return;
        f.style.width = Math.min(KalElSystem.meter, 100) + '%';
        f.style.background = KalElSystem.scrollCharges > 0 ? "#00bfff" : (KalElSystem.meter < 50 ? "#4caf50" : (KalElSystem.meter < 80 ? "#ff9800" : "#f44336"));
        t.innerText = KalElSystem.meter + '%';
    }
};

const CoffeeBreakSystem = {
    isActive: false,
    tryRevive: (cb) => {
        const i = (Game.inventory||[]).indexOf('cafe');
        if(i > -1) {
            Game.inventory.splice(i, 1); // Consome 1 café
            if(window.atualizarHudInventario) window.atualizarHudInventario();
            CoffeeBreakSystem.triggerEffect(cb);
            return true;
        }
        return false;
    },
    triggerEffect: (cb) => {
        CoffeeBreakSystem.isActive = true;
        const ov = document.getElementById('coffee-break-overlay'), tx = document.getElementById('coffee-break-text');
        if(ov) ov.style.display = 'flex';
        if(tx) {
            tx.style.animation = 'none'; tx.offsetHeight; tx.style.animation = 'popIn 0.5s forwards';
        }
        
        // Empurra inimigos para longe
        if(Game.minigame.entities) {
            Game.minigame.entities.forEach(e => {
                if(e.type === 'enemy') {
                    const dx = e.x - Game.minigame.player.x, dy = e.y - Game.minigame.player.y;
                    e.x += (dx >= 0 ? 150 : -150); e.y += (dy >= 0 ? 150 : -150);
                    e.x = Math.max(50, Math.min(800, e.x)); e.y = Math.max(50, Math.min(500, e.y));
                }
            });
        }
        
        // Listener para continuar (Clique ou Enter)
        const resume = (e) => {
            if(e.type === 'keydown' && e.key !== 'Enter') return;
            
            document.removeEventListener('keydown', resume);
            document.removeEventListener('click', resume);
            document.removeEventListener('touchstart', resume);
            
            if(ov) ov.style.display = 'none';
            CoffeeBreakSystem.isActive = false;
            
            if(Game.minigame.player) {
                Game.minigame.player.invincible = true;
                Game.minigame.player.color = "gold"; // Feedback visual
                setTimeout(() => { 
                    if(Game.minigame.player) {
                        Game.minigame.player.invincible = false;
                        Game.minigame.player.color = Game.minigame.mode === "ARENA" ? "cyan" : "#880afe";
                    }
                }, 2000);
            }
            if(cb) cb();
        };

        setTimeout(() => {
            document.addEventListener('keydown', resume);
            document.addEventListener('click', resume);
            document.addEventListener('touchstart', resume, {passive: false});
        }, 500);
    }
};

// --- 5. ENGINE PRINCIPAL ---
const Engine = {
    injectScene: (sd) => {
        Game.state = "NOVEL"; Game.currentScene = sd;
        document.getElementById("novel-layer").style.display = "block";
        document.getElementById("game-canvas").style.display = "none";
        document.getElementById("background-layer").style.background = `url('${sd.bg}') center/cover`;
        
        const cImg = document.getElementById("char-sprite");
        cImg.src = Assets.chars[sd.char] || "";
        cImg.style.display = Assets.chars[sd.char] ? "block" : "none";
        
        document.getElementById("speaker-name").innerText = "KAL-EL FREIRA";
        document.getElementById("dialogue-text").innerText = sd.text;
        
        const cd = document.getElementById("choices-container");
        document.getElementById("click-layer").innerHTML = ""; cd.innerHTML = "";
        sd.choices.forEach(c => {
            const b = document.createElement("button"); b.className = "choice-btn"; b.innerText = c.text;
            b.onclick = () => {
                if(c.action === "KAL_CORRECT") KalElSystem.processAnswer(true);
                else if(c.action === "KAL_WRONG") KalElSystem.processAnswer(false);
                else Engine.loadScene(c.next);
            };
            cd.appendChild(b);
        });
    },
    loadScene: (sid) => {
        Game.state = "NOVEL"; AudioSys.playMusic('bgm-main');
        const sc = Scripts[sid];
        if(!sc) return console.error("Cena 404:", sid);
        Game.currentScene = sc;

        document.getElementById("novel-layer").style.display = "block";
        document.getElementById("game-canvas").style.display = "none";
        document.getElementById("click-layer").innerHTML = "";
        document.getElementById("choices-container").innerHTML = "";
        document.getElementById("dialogue-box").classList.remove("dialogue-hidden");
        
        if(window.atualizarHudInventario) window.atualizarHudInventario();

        if(sc.special === "INPUT_NAME") {
            document.getElementById("dialogue-box").style.display = "none";
            const m = document.getElementById("name-input-modal"), i = document.getElementById("player-name-input");
            m.style.display = "block"; setTimeout(() => i.focus(), 100);
            const act = () => {
                if(i.value.trim() !== "") {
                    Game.playerName = i.value.trim();
                    m.style.display = "none";
                    document.getElementById("dialogue-box").style.display = "block";
                    Engine.loadScene("ccet_intro");
                }
            };
            document.getElementById("btn-confirm-name").onclick = act;
            i.onkeypress = (e) => { if(e.key === 'Enter') act(); };
            return;
        }

        document.getElementById("background-layer").style.background = sc.bg === "black" ? "#000" : `url('${sc.bg}') center/cover`;
        const cImg = document.getElementById("char-sprite");
        cImg.src = Assets.chars[sc.char] && sc.char !== 'nobody' ? Assets.chars[sc.char] : "";
        cImg.style.display = cImg.src ? "block" : "none";

        let txt = sc.text.replace(/{nome}/g, Game.playerName || "Calouro");
        if(txt.includes("{stats}")) txt = txt.replace("{stats}", `\n(Vitórias: ${Game.wins} | Derrotas: ${Game.losses})`);
        
        document.getElementById("speaker-name").innerText = sc.char === 'nobody' ? '' : sc.char.toUpperCase();
        document.getElementById("dialogue-text").innerText = txt;

        const cl = document.getElementById("click-layer"), cd = document.getElementById("choices-container");
        sc.choices.forEach(c => {
            const b = document.createElement("button");
            b.onclick = () => {
                if(c.action === "START_ARENA") Minigame.startArena();
                else if(c.action === "START_KAL_QUIZ") KalElSystem.start();
                else if(c.action === "START_MAZE") Minigame.startMaze();
                else if(c.action === "GET_REWARD_CAFE") { 
                    Game.wins++; 
                    Game.inventory.push('cafe'); 
                    if(window.atualizarHudInventario) window.atualizarHudInventario();
                    AudioSys.playSFX('sfx-collect');
                    Engine.loadScene('end_cafe'); 
                }
                else if(c.action === "GET_REWARD_SCROLL") { 
                    Game.wins++; 
                    Game.inventory.push('pergaminho');
                    if(window.atualizarHudInventario) window.atualizarHudInventario();
                    AudioSys.playSFX('sfx-collect');
                    Engine.loadScene('end_pergaminho'); 
                }
                else if(c.action === "REGISTER_LOSS_HUB") { Game.losses++; Engine.loadScene('ccet_hub'); }
                else Engine.loadScene(c.next);
            };
            if(c.coords) {
                b.className = "hotspot-footprint"; b.innerHTML = "👣";
                b.style.top = c.coords.top; b.style.left = c.coords.left;
                b.setAttribute("data-label", c.text); cl.appendChild(b);
            } else {
                b.className = "choice-btn"; b.innerText = c.text; cd.appendChild(b);
            }
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
        Game.state = "GAME"; AudioSys.playMusic('bgm-minigame');
        UI.hideNovel(); 
        Game.minigame.mode = "ARENA";
        Input.reset();
        
        Game.minigame.player = { x: 420, y: 280, w: 40, h: 40, color: 'cyan', type: 'player', invincible: false };
        
        Game.minigame.entities = [
            { x: 100, y: 300, w: 50, h: 50, type: 'wall' }, { x: 300, y: 100, w: 50, h: 50, type: 'wall' },
            { x: 500, y: 400, w: 50, h: 50, type: 'wall' }, { x: 700, y: 200, w: 50, h: 50, type: 'wall' },
            { x: 900, y: 350, w: 50, h: 50, type: 'wall' }, { x: 1100, y: 150, w: 50, h: 50, type: 'wall' },
            { x: 600, y: 550, w: 50, h: 50, type: 'wall' }, { x: 1200, y: 500, w: 50, h: 50, type: 'wall' },
            { x: 100, y: 20, w: 40, h: 40, type: 'enemy', speed: 2.8 }, 
            { x: 750, y: 500, w: 40, h: 40, type: 'enemy', speed: 3.2 }
        ];
        
        Game.minigame.collectibles = [
            { x: 50, y: 50 }, { x: 750, y: 300 }, { x: 250, y: 200 }, { x: 100, y: 400 }, { x: 300, y: 200 },
            { x: 600, y: 100 }, { x: 200, y: 500 }, { x: 800, y: 250 }, { x: 350, y: 50 }, { x: 500, y: 50 }
        ].map(p => ({ ...p, w: 20, h: 20, active: true }));
        
        Game.minigame.requiredScore = Game.minigame.collectibles.length;
    },
    startMaze: () => {
        Game.state = "GAME"; AudioSys.playMusic('bgm-maze');
        UI.hideNovel(); Game.minigame.mode = "QUIZ";
        Game.minigame.quizLevel = 0; Game.minigame.collectibles = [];
        Game.minigame.player = { x: 415, y: 480, w: 40, h: 40, color: '#880afe', type: 'player' };
        Input.reset();
        const dY = 100, dS = 80;
        Game.minigame.entities = [
            { x: 150, y: dY, w: dS, h: dS, type: 'door', answerIndex: 0, color: '#8B4513' },
            { x: 400, y: dY, w: dS, h: dS, type: 'door', answerIndex: 1, color: '#8B4513' },
            { x: 650, y: dY, w: dS, h: dS, type: 'door', answerIndex: 2, color: '#8B4513' }
        ];
    }
};

// --- 6. INPUT E FÍSICA ---
const Input = {
    keys: {}, touch: { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, velocityX: 0, velocityY: 0 },
    reset: () => { Input.keys = {}; Input.touch = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, velocityX: 0, velocityY: 0 }; },
    init: () => {
        window.addEventListener("keydown", e => { if(e.target.tagName !== "INPUT") { if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"].includes(e.key)) e.preventDefault(); Input.keys[e.key] = true; Input.keys[e.key.toLowerCase()] = true; } });
        window.addEventListener("keyup", e => { if(e.target.tagName !== "INPUT") { Input.keys[e.key] = false; Input.keys[e.key.toLowerCase()] = false; } });
        
        const cv = document.getElementById("game-canvas");
        if(cv) {
            const start = (x, y) => {
                Input.touch.active = true; const r = cv.getBoundingClientRect();
                Input.touch.startX = x - r.left; Input.touch.startY = y - r.top;
                Input.touch.currentX = Input.touch.startX; Input.touch.currentY = Input.touch.startY;
                Input.touch.velocityX = 0; Input.touch.velocityY = 0;
                if (Game.minigame.mode === "QUIZ") {
                    Game.minigame.entities.forEach(e => {
                        if (e.type === 'door' && Input.touch.startX >= e.x && Input.touch.startX <= e.x+e.w && Input.touch.startY >= e.y && Input.touch.startY <= e.y+e.h) {
                            const cQ = QuizData[Game.minigame.quizLevel];
                            if(e.answerIndex === cQ.correta) {
                                Game.minigame.quizLevel++;
                                if(Game.minigame.quizLevel >= QuizData.length) Engine.loadScene('gw_win');
                                else { Game.minigame.player.x = 415; Game.minigame.player.y = 480; }
                            } else {
                                AudioSys.playSFX('sfx-lose'); Engine.loadScene('gw_lose');
                            }
                        }
                    });
                }
            };
            cv.addEventListener("touchstart", e => { e.preventDefault(); start(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});
            cv.addEventListener("mousedown", e => start(e.clientX, e.clientY));
            const move = (x, y) => {
                if (!Input.touch.active) return;
                const r = cv.getBoundingClientRect();
                Input.touch.currentX = x - r.left; Input.touch.currentY = y - r.top;
                Input.touch.velocityX = (Input.touch.currentX - Input.touch.startX) * 0.2;
                Input.touch.velocityY = (Input.touch.currentY - Input.touch.startY) * 0.2;
                if (["ARENA","QUIZ"].includes(Game.minigame.mode)) {
                    const p = Game.minigame.player, nX = Input.touch.currentX - p.w/2, nY = Input.touch.currentY - p.h/2;
                    p.x = Math.max(0, Math.min(cv.width - p.w, nX)); p.y = Math.max(0, Math.min(cv.height - p.h, nY));
                }
            };
            cv.addEventListener("touchmove", e => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});
            cv.addEventListener("mousemove", e => move(e.clientX, e.clientY));
            const end = () => Input.touch.active = false;
            cv.addEventListener("touchend", e => { e.preventDefault(); end(); }); cv.addEventListener("mouseup", end);
        }
    }
};

const Physics = {
    update: () => {
        if (CoffeeBreakSystem.isActive) return;
        const p = Game.minigame.player;
        if (!p) return;

        const s = 5; let dx = 0, dy = 0;
        
        // Controles
        if (Input.keys.ArrowUp || Input.keys.w) dy = -s; 
        if (Input.keys.ArrowDown || Input.keys.s) dy = s;
        if (Input.keys.ArrowLeft || Input.keys.a) dx = -s; 
        if (Input.keys.ArrowRight || Input.keys.d) dx = s;
        
        // Touch Physics (Simples Inércia)
        if (!Input.touch.active && (Math.abs(Input.touch.velocityX) > 0.1 || Math.abs(Input.touch.velocityY) > 0.1)) {
            dx += Input.touch.velocityX; dy += Input.touch.velocityY;
            Input.touch.velocityX *= 0.9; Input.touch.velocityY *= 0.9;
        }

        const nX = p.x + dx, nY = p.y + dy;
        // Limites da tela
        if (nX >= 0 && nX + p.w <= Game.canvas.width) p.x = nX;
        if (nY >= 0 && nY + p.h <= Game.canvas.height) p.y = nY;

        const chk = (r1, r2) => (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
        
        Game.minigame.entities.forEach(e => {
            if (chk(p, e)) {
                if (e.type === 'wall') {
                    // Colisão simples: Reverte movimento
                    // Melhoria: Reverter apenas no eixo da colisão para não prender
                    const prevX = p.x - dx;
                    const prevY = p.y - dy;
                    
                    // Se estava livre no X, mas bateu agora, reverte X
                    if (prevX + p.w <= e.x || prevX >= e.x + e.w) {
                         p.x -= dx;
                    } else {
                         p.y -= dy;
                    }
                }
                else if (e.type === 'enemy' && Game.minigame.mode === 'ARENA') {
                    if (!p.invincible && !CoffeeBreakSystem.isActive) {
                        if (!CoffeeBreakSystem.tryRevive(()=>{})) { 
                            AudioSys.playSFX('sfx-lose'); 
                            Engine.loadScene('ad_lose'); 
                        }
                    }
                }
                else if (e.type === 'door' && Game.minigame.mode === 'QUIZ') {
                    const cQ = QuizData[Game.minigame.quizLevel];
                    if (e.answerIndex === cQ.correta) {
                        Game.minigame.quizLevel++;
                        if (Game.minigame.quizLevel >= QuizData.length) Engine.loadScene('gw_win');
                        else { p.x = 415; p.y = 480; Input.touch.active = false; }
                    } else if (!p.invincible) {
                         if (!CoffeeBreakSystem.tryRevive(() => p.y += 100)) {
                             AudioSys.playSFX('sfx-lose'); p.x=415; p.y=480; Engine.loadScene('gw_lose');
                         }
                    }
                }
            }
            if (e.type === 'enemy' && Game.minigame.mode === 'ARENA') {
                const edx = p.x - e.x, edy = p.y - e.y, dst = Math.sqrt(edx*edx + edy*edy);
                if (dst > 10) { e.x += (edx/dst)*e.speed; e.y += (edy/dst)*e.speed; }
            }
        });

        if (Game.minigame.mode === 'ARENA') {
            let cnt = 0;
            Game.minigame.collectibles.forEach(c => {
                if(c.active) { if(chk(p, c)) { c.active = false; } }
                else cnt++;
            });
            if(cnt >= Game.minigame.requiredScore) Engine.loadScene('ad_win');
        }
    }
};

// --- 7. RENDERIZAÇÃO ---
const Renderer = {
    draw: () => {
        const cx = Game.ctx, cv = Game.canvas;
        cx.fillStyle = Game.minigame.mode === 'ARENA' ? "#333" : "#222";
        cx.fillRect(0, 0, cv.width, cv.height);

        if (Game.minigame.mode === 'QUIZ') {
            const q = QuizData[Game.minigame.quizLevel];
            if(q) {
                cx.fillStyle = "#fff"; cx.font = "bold 24px Arvo"; cx.textAlign = "center";
                cx.fillText(q.pergunta, cv.width/2, 60);
                cx.font = "16px Arvo"; cx.fillStyle = "#aaa"; cx.fillText("Escolha a porta correta:", cv.width/2, 90);
            }
        }
        if (Game.minigame.mode === 'ARENA' && (window.innerWidth <= 768 || Input.touch.active)) {
            cx.font = "14px Arvo"; cx.fillStyle = "#4CAF50"; cx.textAlign = "center";
            cx.fillText("Arraste para mover", cv.width/2, cv.height - 20);
        }

        Game.minigame.entities.forEach(e => {
            if (e.type === 'door') {
                cx.fillStyle = e.color; cx.fillRect(e.x, e.y, e.w, e.h);
                cx.strokeStyle = "#DAA520"; cx.lineWidth = 4; cx.strokeRect(e.x, e.y, e.w, e.h);
                if (Game.minigame.mode === 'QUIZ') {
                    const q = QuizData[Game.minigame.quizLevel];
                    cx.fillStyle = "#fff"; cx.font = "bold 18px Arvo"; cx.textAlign = "center"; cx.textBaseline = "middle";
                    cx.fillText(q.opcoes[e.answerIndex], e.x+e.w/2, e.y+e.h/2); cx.textBaseline = "alphabetic";
                }
            } else {
                cx.fillStyle = e.type==='wall'?"#555":e.type==='enemy'?"#ff3333":"#f00";
                cx.fillRect(e.x, e.y, e.w, e.h);
                // Olhos do inimigo
                if(e.type === 'enemy') {
                    cx.fillStyle = "#fff"; cx.fillRect(e.x+10, e.y+10, 8, 8); cx.fillRect(e.x+22, e.y+10, 8, 8);
                }
            }
        });

        if (Game.minigame.mode === 'ARENA') {
            cx.fillStyle = "gold";
            Game.minigame.collectibles.forEach(c => {
                if(c.active) { 
                    cx.beginPath(); cx.arc(c.x+c.w/2, c.y+c.h/2, c.w/2, 0, Math.PI*2); 
                    cx.fill(); cx.strokeStyle = "orange"; cx.stroke(); 
                }
            });
        }

        const p = Game.minigame.player;
        if (p.invincible && Math.floor(Date.now()/100)%2===0) {
            cx.fillStyle = "red"; // Pisca vermelho quando invencivel (dano)
        } else {
            cx.fillStyle = p.color;
        }
        cx.fillRect(p.x, p.y, p.w, p.h);
        
        if (Input.touch.active) {
            cx.fillStyle = "rgba(0, 255, 0, 0.3)"; cx.beginPath(); cx.arc(Input.touch.currentX, Input.touch.currentY, 20, 0, Math.PI*2); cx.fill();
        }
        cx.textAlign = "start";
    }
};

const UI = {
    hideNovel: () => { document.getElementById("novel-layer").style.display = "none"; document.getElementById("game-canvas").style.display = "block"; },
    showJubilometro: (s) => document.getElementById('jubilometro-container').style.display = s ? 'flex' : 'none'
};

// --- CORREÇÃO DO INVENTÁRIO (AGRUPA ITENS x2, x3) ---
window.atualizarHudInventario = () => {
    const b = document.getElementById('inventory-box'); if(!b) return;
    b.innerHTML = '';
    
    // Contagem de itens
    const counts = {};
    Game.inventory.forEach(x => counts[x] = (counts[x] || 0) + 1);

    Object.keys(counts).forEach(key => {
        const d = document.createElement('div'); d.className = 'inv-item';
        // Mostra quantidade se > 1 (ex: x2)
        const qtd = counts[key] > 1 ? `<span style="font-size:0.6em; position:absolute; bottom:0; right:2px; color:black; font-weight:bold;">x${counts[key]}</span>` : '';
        
        if(key === 'cafe') { 
            d.innerHTML = '☕' + qtd; 
            d.title = `Café: Vida Extra (${counts[key]})`; 
        }
        else if(key === 'pergaminho') { 
            d.innerHTML = '📜' + qtd; 
            d.title = `Pergaminho: Proteção (${counts[key]})`; 
        }
        b.appendChild(d);
    });
    
    b.style.display = Game.inventory.length > 0 ? 'flex' : 'none';
};

// --- 8. LOAD ---
const AssetLoader = {
    total: 0, loaded: 0,
    start: () => {
        const iSrc = [...Object.values(Assets.chars), ...Object.values(Assets.bg)];
        const aEls = Array.from(document.querySelectorAll('audio'));
        AssetLoader.total = iSrc.length + aEls.length;
        if(!AssetLoader.total) return AssetLoader.finish();
        
        const prog = () => { AssetLoader.loaded++; document.getElementById('loading-text').innerText = `Carregando... ${Math.floor((AssetLoader.loaded/AssetLoader.total)*100)}%`; if(AssetLoader.loaded>=AssetLoader.total) AssetLoader.finish(); };
        
        iSrc.forEach(s => { const i = new Image(); i.onload = prog; i.onerror = prog; i.src = s; });
        aEls.forEach(a => { if(a.readyState>=3) prog(); else { a.addEventListener('canplaythrough', prog, {once:true}); a.addEventListener('error', prog, {once:true}); a.load(); } });
    },
    finish: () => { setTimeout(() => { document.getElementById('loading-state').style.display='none'; document.getElementById('start-state').style.display='block'; }, 500); }
};

window.onload = () => {
    document.getElementById('btn-force-mobile').onclick = () => document.getElementById('mobile-warning').style.display = 'none';
    Game.canvas = document.getElementById("game-canvas"); Game.ctx = Game.canvas.getContext("2d");
    Input.init(); if(typeof createSnow === "function") createSnow(); AssetLoader.start();
    document.getElementById('btn-start').onclick = () => {
        AudioSys.init();
        const s = document.getElementById('loading-screen'); s.style.transition = "opacity 1s"; s.style.opacity = 0;
        setTimeout(() => { s.style.display = 'none'; Engine.loadScene("inicio"); requestAnimationFrame(Engine.gameLoop); }, 1000);
    };
};