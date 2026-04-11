// Tiny i18n: a flat key→string map per language. Keys use dot notation by
// convention (lobby.title, gameover.win, etc.) so they're greppable. The t()
// helper supports `{name}` style placeholders. Falls back to English if a key
// is missing in the active language, then to the raw key.

export type Language = 'en' | 'no';

export interface LanguageOption {
  code: Language;
  label: string;
  flag: string;
}

export const LANGUAGES: readonly LanguageOption[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'no', label: 'Norsk', flag: '🇳🇴' },
] as const;

type Dict = Record<string, string>;

const en: Dict = {
  // App / connection
  'app.connecting': 'Connecting to server...',

  // Lobby
  'lobby.topsi.greeting': 'Hi!',
  'lobby.tagline': 'The classic card game — now multiplayer',
  'lobby.join.heading': 'Join a Game',
  'lobby.join.subheading': 'Enter your name to challenge an opponent',
  'lobby.join.namePlaceholder': "What's your name?",
  'lobby.join.button': '🎮 Find Game',
  'lobby.join.connecting': 'Connecting...',
  'lobby.info.flip': 'Flip cards to reveal images',
  'lobby.info.match': 'Remember & find matching pairs',
  'lobby.info.win': 'Outscore your opponent to win!',
  'lobby.spectate.toggle': '👀 Watch a game',
  'lobby.spectate.placeholder': 'Enter watch code',
  'lobby.spectate.button': 'Watch',
  'lobby.themes.label': 'Six magical worlds await',
  'lobby.rules.heading': '👇 Tap the cards to learn the rules',
  'lobby.mode.heading': 'Battle Mode',
  'lobby.mode.classic': 'Classic',
  'lobby.mode.classic.desc': 'Standard 5×5 — first to win the most pairs',
  'lobby.mode.mega': '⚡ Mega Duel',
  'lobby.mode.mega.desc': 'Grid grows on every 3-streak. Score multipliers. Final Duel.',

  // Mega Mode in-game UI
  'mega.wave.banner.title': 'MEGA WAVE',
  'mega.wave.unlock.subtitle': '{name} unlocked Wave {level}!',
  'mega.wave.final.title': 'FINAL DUEL',
  'mega.wave.final.subtitle': 'Find the MEGA PAIR to win!',
  'mega.multiplier': '×{n}',

  // Waiting room
  'waiting.title': 'Searching for opponent...',
  'waiting.subtitle': 'Waiting for another player to join',
  'waiting.cancel': 'Cancel',

  // Category picker
  'category.youGoFirst': 'You go first!',
  'category.otherGoesFirst': '{name} goes first',
  'category.waitingForChoice': '{name} is choosing the category…',
  'category.chooseDeck': 'You picked the short straw — choose the deck:',

  // Categories
  'category.magical.label': 'Magical',
  'category.magical.blurb': 'Princes, princesses, and storybook wonders',
  'category.mystical.label': 'Mystical',
  'category.mystical.blurb': 'Unicorns, dragons, and mythical beasts',
  'category.tropical.label': 'Tropical',
  'category.tropical.blurb': 'Sun, surf, and island treasures',
  'category.jungle.label': 'Jungle',
  'category.jungle.blurb': 'Wild animals deep in the canopy',
  'category.deep-sea.label': 'Deep Sea',
  'category.deep-sea.blurb': 'Glowing creatures from the abyss',
  'category.universe.label': 'The Universe',
  'category.universe.blurb': 'Planets, moons, rockets, and stars',

  // Versus screen
  'versus.you': 'you',
  'versus.startsFirst': 'starts first',
  'versus.youStart': 'You start!',
  'versus.getReady': 'Get ready...',

  // Gameplay
  'game.turn.yours': 'Your turn — pick a card!',
  'game.turn.yoursAgain': 'Match! Still your turn — go again!',
  'game.turn.opponent': "Opponent's turn...",
  'game.turn.spectator': "{name}'s turn",
  'game.pairsRemaining': '{n} pairs remaining',
  'game.spectateCode': 'Watch code:',
  'game.copyLink': 'Copy link',
  'game.spectatorBadge': 'Spectating',

  // Sudden death
  'sd.title': 'SUDDEN DEATH',
  'sd.shuffling': 'Shuffling remaining cards...',
  'sd.goesFirst': 'goes first!',
  'sd.banner': 'SUDDEN DEATH — Next match wins!',
  'sd.turnYours': 'Your turn — find a match to win!',

  // Game over
  'gameover.win': 'You Won!',
  'gameover.loss': 'You Lost',
  'gameover.draw': "It's a Draw!",
  'gameover.opponentLeft.title': 'Opponent Left',
  'gameover.opponentLeft.body': 'Your opponent disconnected from the game.',
  'gameover.findNew': 'Find New Game',
  'gameover.backToLobby': 'Back to Lobby',
  'gameover.vs': 'vs',
  'gameover.rematch': 'Rematch',
  'gameover.rematch.waiting': '✓ Rematch sent — waiting for opponent…',
  'gameover.rematch.accept': '✨ Accept Rematch',
  'gameover.rematch.banner': '{name} wants a rematch!',
  'gameover.rematch.banner.suffix': 'wants a rematch!',
};

const no: Dict = {
  'app.connecting': 'Kobler til serveren...',

  'lobby.topsi.greeting': 'Hei!',
  'lobby.tagline': 'Det klassiske kortspillet — nå med flere spillere',
  'lobby.join.heading': 'Bli med i et spill',
  'lobby.join.subheading': 'Skriv inn navnet ditt for å utfordre en motstander',
  'lobby.join.namePlaceholder': 'Hva heter du?',
  'lobby.join.button': '🎮 Finn spill',
  'lobby.join.connecting': 'Kobler til...',
  'lobby.info.flip': 'Vend kort for å avsløre bilder',
  'lobby.info.match': 'Husk og finn par',
  'lobby.info.win': 'Få flere poeng enn motstanderen for å vinne!',
  'lobby.spectate.toggle': '👀 Se på et spill',
  'lobby.spectate.placeholder': 'Skriv inn tilskuerkode',
  'lobby.spectate.button': 'Se',
  'lobby.themes.label': 'Seks magiske verdener venter',
  'lobby.rules.heading': '👇 Vend kortene for å lære reglene',
  'lobby.mode.heading': 'Kampmodus',
  'lobby.mode.classic': 'Klassisk',
  'lobby.mode.classic.desc': 'Vanlig 5×5 — flest par vinner',
  'lobby.mode.mega': '⚡ Megaduell',
  'lobby.mode.mega.desc': 'Brettet vokser ved 3 på rad. Poengmultiplikatorer. Sluttduell.',

  'mega.wave.banner.title': 'MEGABØLGE',
  'mega.wave.unlock.subtitle': '{name} låste opp bølge {level}!',
  'mega.wave.final.title': 'SLUTTDUELL',
  'mega.wave.final.subtitle': 'Finn MEGAPARET for å vinne!',
  'mega.multiplier': '×{n}',

  'waiting.title': 'Leter etter en motstander...',
  'waiting.subtitle': 'Venter på at en annen spiller blir med',
  'waiting.cancel': 'Avbryt',

  'category.youGoFirst': 'Du starter!',
  'category.otherGoesFirst': '{name} starter',
  'category.waitingForChoice': '{name} velger kategori…',
  'category.chooseDeck': 'Du trakk det korteste strået — velg kortstokken:',

  'category.magical.label': 'Magisk',
  'category.magical.blurb': 'Prinser, prinsesser og eventyrunder',
  'category.mystical.label': 'Mystisk',
  'category.mystical.blurb': 'Enhjørninger, drager og mytiske vesener',
  'category.tropical.label': 'Tropisk',
  'category.tropical.blurb': 'Sol, bølger og øy-skatter',
  'category.jungle.label': 'Jungel',
  'category.jungle.blurb': 'Ville dyr dypt inne i jungelen',
  'category.deep-sea.label': 'Havdypet',
  'category.deep-sea.blurb': 'Lysende skapninger fra dypet',
  'category.universe.label': 'Universet',
  'category.universe.blurb': 'Planeter, måner, raketter og stjerner',

  'versus.you': 'deg',
  'versus.startsFirst': 'starter',
  'versus.youStart': 'Du starter!',
  'versus.getReady': 'Gjør deg klar...',

  'game.turn.yours': 'Din tur — velg et kort!',
  'game.turn.yoursAgain': 'Treff! Fortsatt din tur — prøv igjen!',
  'game.turn.opponent': 'Motstanderens tur...',
  'game.turn.spectator': '{name} sin tur',
  'game.pairsRemaining': '{n} par igjen',
  'game.spectateCode': 'Tilskuerkode:',
  'game.copyLink': 'Kopier lenke',
  'game.spectatorBadge': 'Tilskuer',

  'sd.title': 'SUDDEN DEATH',
  'sd.shuffling': 'Stokker kortene...',
  'sd.goesFirst': 'starter!',
  'sd.banner': 'SUDDEN DEATH — Neste par vinner!',
  'sd.turnYours': 'Din tur — finn et par for å vinne!',

  'gameover.win': 'Du vant!',
  'gameover.loss': 'Du tapte',
  'gameover.draw': 'Det er uavgjort!',
  'gameover.opponentLeft.title': 'Motstander forlot spillet',
  'gameover.opponentLeft.body': 'Motstanderen din har koblet fra spillet.',
  'gameover.findNew': 'Finn nytt spill',
  'gameover.backToLobby': 'Tilbake til lobbyen',
  'gameover.vs': 'mot',
  'gameover.rematch': 'Omkamp',
  'gameover.rematch.waiting': '✓ Omkamp sendt — venter på motstander…',
  'gameover.rematch.accept': '✨ Godta omkamp',
  'gameover.rematch.banner': '{name} vil ha omkamp!',
  'gameover.rematch.banner.suffix': 'vil ha omkamp!',
};

export const TRANSLATIONS: Record<Language, Dict> = { en, no };
