export interface IGameState {
  players: IPlayer[];
  potions: IPotion[];
  fieldSize: {
    width: number;
    height: number;
  };
  eliminatedPlayers: Record<string, string>;
}

export interface IPlayer {
  id: string;
  name: string;
  xp: number;
  level: number;
  species: Pokemon;
  health: number;
  x: number;
  y: number;
}

export interface IPotion {
  x: number;
  y: number;
}

export type Command = 'left' | 'right' | 'up' | 'down';
export type Commands = Record<string, Command>;

export interface Pokemon {
  name: string;
  maxHealth: number;
  attackPower: number;
  speciesId: number;
  l1EvolutionSpeciesId: number;
  l2EvolutionSpeciesId: number;
  type: PokemonType;
}

export enum PokemonType {
  Grass,
  Fire,
  Water,
  Psychic,
  Fighting,
  Dark
}