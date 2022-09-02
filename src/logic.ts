import { Command, Commands, IGameState, IPlayer, Pokemon, PokemonType } from './models';

const potionCount = 10;
const aiCount = 20;
let aiPlayers: IPlayer[] = [];

const availablePokemon: Pokemon[] = [
  {
    name: 'Bulbasaur',
    maxHealth: 6,
    attackPower: 2,
    speciesId: 1,
    l1EvolutionSpeciesId: 2,
    l2EvolutionSpeciesId: 3,
    type: PokemonType.Grass
  },
  {
    name: 'Charmander',
    maxHealth: 3,
    attackPower: 5,
    speciesId: 4,
    l1EvolutionSpeciesId: 5,
    l2EvolutionSpeciesId: 6,
    type: PokemonType.Fire,
  },
  {
    name: 'Squirtle',
    maxHealth: 4,
    attackPower: 4,
    speciesId: 7,
    l1EvolutionSpeciesId: 8,
    l2EvolutionSpeciesId: 9,
    type: PokemonType.Water
  },
  {
    name: 'Abra',
    maxHealth: 2,
    attackPower: 6,
    speciesId: 63,
    l1EvolutionSpeciesId: 64,
    l2EvolutionSpeciesId: 65,
    type: PokemonType.Psychic
  },
  {
    name: 'Machop',
    maxHealth: 3,
    attackPower: 5,
    speciesId: 66,
    l1EvolutionSpeciesId: 67,
    l2EvolutionSpeciesId: 68,
    type: PokemonType.Fighting
  },
  {
    name: 'Deinos',
    maxHealth: 4,
    attackPower: 4,
    speciesId: 633,
    l1EvolutionSpeciesId: 634,
    l2EvolutionSpeciesId: 635,
    type: PokemonType.Dark
  }
];

export function getInitialState(): IGameState {
  return {
    players: [],
    potions: [],
    fieldSize: {
      width: 100,
      height: 100,
    },
    eliminatedPlayers: {},
  };
}

export function gameLogic(state: IGameState, commands: Commands): IGameState {
  moveAiPlayers(commands),
  evaluateCommands(state, commands);
  resolvePotionCollisions(state);
  resolvePlayerCollisions(state);
  addMorePotions(state);
  while (aiPlayers.length < aiCount) {
    const newAi = generateAiPlayer(state);
    aiPlayers.push(newAi);
    state.players.push(newAi);
  }
  return state;
}

function evaluateCommands(state: IGameState, commands: Commands) {
  Object.keys(commands).forEach((playerId) => {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      return;
    }
    const command = commands[playerId];
    if (command === 'up') {
      const newY = player.y - 1;
      if (newY < 0) {
        return;
      }
      player.y = newY;
    } else if (command === 'down') {
      const newY = player.y + 1;
      if (newY > state.fieldSize.height) {
        return;
      }
      player.y = newY;
    } else if (command === 'left') {
      const newX = player.x - 1;
      if (newX < 0) {
        return;
      }
      player.x = newX;
    } else if (command === 'right') {
      const newX = player.x + 1;
      if (newX > state.fieldSize.width) {
        return;
      }
      player.x = newX;
    }
  });
}

function resolvePotionCollisions(state: IGameState) {
  state.potions.slice().forEach((coin) => {
    const player = state.players.find((p) => p.x === coin.x && p.y === coin.y);
    if (player) {
      //TODO: Different levels of potion
      player.health = Math.min(getRealMaxHealth(player), player.health + 10);
      state.potions = state.potions.filter((c) => c !== coin);
    }
  });
}

function resolvePlayerCollisions(state: IGameState) {
  state.players.slice().forEach((player) => {
    if (!state.players.includes(player)) {
      return;
    }
    const otherPlayer = state.players.find(
      (p) => p !== player && p.x === player.x && p.y === player.y
    );
    if (otherPlayer) {
      let damageToOther = player.level * player.species.attackPower;
      let damageToPlayer = otherPlayer.level * otherPlayer.species.attackPower;

      damageToOther = adjustDamage(damageToOther, player.species.type, otherPlayer.species.type);
      damageToPlayer = adjustDamage(damageToPlayer, otherPlayer.species.type, player.species.type);

      otherPlayer.health -= damageToOther;
      player.health -= damageToPlayer;

      if (player.health > 0 && otherPlayer.health > 0) {
        bounce(player);
        bounce(otherPlayer);
      } else if (player.health <= 0 && otherPlayer.health <= 0) {
        removePlayer(state, player, otherPlayer);
        removePlayer(state, otherPlayer, player);
      } else if (otherPlayer.health <= 0) {
        xpUp(player, otherPlayer.level);
        removePlayer(state, otherPlayer, player);
      } else {
        xpUp(otherPlayer, player.level);
        removePlayer(state, player, otherPlayer);
      }
    }
  });
}

function adjustDamage(raw: number, source: PokemonType, target: PokemonType): number {
  const effectivenessMap: Record<PokemonType, { weakTo: PokemonType, strongTo: PokemonType }> = {
    [PokemonType.Grass]: { weakTo: PokemonType.Fire, strongTo: PokemonType.Water },
    [PokemonType.Fire]: { weakTo: PokemonType.Water, strongTo: PokemonType.Grass },
    [PokemonType.Water]: { weakTo: PokemonType.Grass, strongTo: PokemonType.Fire },
    [PokemonType.Fighting]: { weakTo: PokemonType.Psychic, strongTo: PokemonType.Dark },
    [PokemonType.Psychic]: { weakTo: PokemonType.Dark, strongTo: PokemonType.Fighting },
    [PokemonType.Dark]: { weakTo: PokemonType.Fighting, strongTo: PokemonType.Psychic },
  }

  const mapEntry = effectivenessMap[source];

  if (target === mapEntry.strongTo) {
    return raw * 2;
  } else if (target === mapEntry.weakTo) {
    return Math.ceil(raw / 2);
  } else {
    return raw;
  }
}

function bounce(player: IPlayer): void {
  const update = getUnoccupiedLocation({
    fieldSize: {
      width: 4,
      height: 4
    }
  } as IGameState, { x: player.x, y: player.y} );
  player.x = update.x;
  player.y = update.y;
}

function xpUp(player: IPlayer, xp: number): void {
  player.xp += xp;
  while (player.xp > player.level + 1) {
    player.level++;
    player.xp -= player.level;

    player.health = getRealMaxHealth(player);
  }
}

function removePlayer(state: IGameState, player: IPlayer, eliminatedBy: IPlayer): void {
  state.players = state.players.filter((p) => p !== player);
  state.eliminatedPlayers[player.id] = eliminatedBy.id;
}

function addMorePotions(state: IGameState) {
  while (state.potions.length < potionCount) {
    const location = getUnoccupiedLocation(state);
    state.potions.push({ ...location });
  }
}

function moveAiPlayers(commands: Commands): void {
  // Random movement
  // null means stay put
  aiPlayers.forEach(ai => {
    const possible: Command[] = ['up', 'left', 'down', 'right', null];
    const command: Command = possible[Math.floor(Math.random() * possible.length + 1) - 1];
  
    commands[ai.id] = command;
  });
}

function getRealMaxHealth(player: IPlayer): number {
  return Math.floor(player.level * player.species.maxHealth) * 3;
}

export function generateAiPlayer(state: IGameState): IPlayer {
  const location = getUnoccupiedLocation(state);
  const species = availablePokemon[Math.floor(Math.random() * availablePokemon.length + 1) - 1];
  return {
    x: location.x,
    y: location.y,
    species,
    health: species.maxHealth * 3,
    level: 1,
    name: `AI ${species.name}`,
    xp: 0,
    id: (state.players.length + Object.keys(state.eliminatedPlayers).length + 1).toString()
  }
}

export function getUnoccupiedLocation(state: IGameState, offset: { x: number, y: number } = {x: 0, y: 0}): {
  x: number;
  y: number;
} {
  let location = null;
  while (!location) {
    const x = Math.floor(Math.random() * state.fieldSize.width + offset.x);
    const y = Math.floor(Math.random() * state.fieldSize.height + offset.y);
    if (state.players.find((p) => p.x === x && p.y === y)) {
      continue;
    }
    if (state.potions.find((c) => c.x === x && c.y === y)) {
      continue;
    }
    location = { x, y };
  }
  return location;
}
