import { GameData } from "./main";
import { Ability } from "./abilities";
import { Xtox } from "./parse_utils";
import { TrainerPokemon } from "./trainers/teams";
import { PokePokedex } from "./species/pokedex";

export interface CompactedScripted {
  how: number; // indexed from CompactGameData.ScriptedEncoutersHowT
  map: number; // index from CompactGameData.maps.
}

export interface CompactLocations {
  maps: CompactLocation[];
  landRate: number[];
  waterRate: number[];
  fishRate: number[];
  honeyRate: number[];
  rockRate: number[];
  hiddenRate: number[];
  rodGrade: number[];
}

export interface CompactLocation {
  name: string;
  land: CompactEncounter[] | undefined;
  landR: number | undefined;
  water: CompactEncounter[] | undefined;
  waterR: number | undefined;
  fish: CompactEncounter[] | undefined;
  fishR: number | undefined;
  honey: CompactEncounter[] | undefined;
  honeyR: number | undefined;
  rock: CompactEncounter[] | undefined;
  rockR: number | undefined;
  hidden: CompactEncounter[] | undefined;
  hiddenR: number | undefined;
}

export type CompactEncounter = [
  number, //min
  number, //max
  number, //specie ID
];

export interface CompactEvolution {
  kd: number;
  rs: string;
  in: number;
}

export interface CompactLevelUpMove {
  lv: number;
  id: number;
}

export interface CompactBaseStats {
  base: number[];
  types: number[];
  catchR: number;
  exp: number;
  EVY: number[];
  items: string[] | undefined;
  gender: number;
  eggC: number;
  fren: number;
  grow: number;
  eggG: number[];
  abis: number[];
  inns: number[];
  col: number;
  noFlip: boolean;
  flags: string;
}

export interface compactMove {
  name: string;
  NAME: string; // i could compactify this even more by string | undefined where undefined mean you can reconstruct the NAME by the name
  sName: string;
  eff: number;
  pwr: number;
  types: number[];
  acc: number;
  pp: number;
  chance: number;
  target: number;
  prio: number;
  flags: number[];
  split: number;
  arg: string;
  desc: string;
  descPtr: string;
  lDesc: string;
  lDescPtr: string;
  id: number;
  usesHpType: boolean;
}
export interface CompactSpecie {
  NAME: string;
  name: string;
  stats: CompactBaseStats;
  evolutions: CompactEvolution[];
  eggmoves: number[];
  learnset: CompactLevelUpMove[];
  tmhm: number[];
  tutor: number[];
  forms: number[];
  SEnc: CompactedScripted[]; // scripted encounters
  dex: PokePokedex;
  id: number;
  sprite: string;
  lrnPtr: string;
}

export interface CompactTrainers {
  name: string;
  NAME: string;
  db: boolean;
  party: CompactTrainerPokemon[];
  insane: CompactTrainerPokemon[];
  hell: CompactTrainerPokemon[];
  rem: CompactTrainerRematch[];
  map: number;
  ptr: string;
  ptrInsane: string;
  tclass: number;
  gender: boolean; // true w*man
  music: number;
  pic: number;
  id: number;
  rematchM: string;
}

export interface CompactTrainerPokemon {
  spc: number;
  abi: number;
  ivs: number[];
  evs: number[];
  item: number;
  nature: number;
  moves: number[];
  hpType: number;
}

export interface CompactTrainerRematch {
  db: boolean;
  party: CompactTrainerPokemon[];
  ptr: string;
  NAME: string;
  id: number;
}

export interface CompactBattleItems {
  name: string;
  NAME: string;
  //could add it? desc: string,
}

export interface CompactGameData {
  abilities: Ability[];
  moves: compactMove[];
  species: CompactSpecie[];
  locations: CompactLocations;
  trainers: CompactTrainers[];
  items: CompactBattleItems[];
  typeT: string[]; //types tabes
  targetT: string[]; //targets table
  flagsT: string[];
  effT: string[]; // effect table
  splitT: string[];
  eggT: string[]; // egg group table
  growT: string[]; // Growth Table
  colT: string[]; //color table
  evoKindT: string[];
  natureT: string[];
  scriptedEncoutersHowT: string[];
  mapsT: string[];
  MAPST: string[];
  projet_root: string;
  tclassT: string[];
  tmusicT: string[];
  tpicT: string[];
  tutors: number[];
  tmhms: number[];
}
function initCompactGameData(): CompactGameData {
  return {
    abilities: [],
    moves: [],
    species: [],
    locations: {} as CompactLocations,
    trainers: [],
    typeT: [],
    targetT: [],
    flagsT: [],
    effT: [],
    splitT: [],
    eggT: [],
    growT: [],
    colT: [],
    evoKindT: [],
    items: [],
    natureT: [],
    scriptedEncoutersHowT: [],
    mapsT: [],
    MAPST: [],
    projet_root: "",
    tclassT: [],
    tmusicT: [],
    tpicT: [],
    tutors: [],
    tmhms: [],
  };
}

export function compactify(gameData: GameData): CompactGameData {
  const compacted = initCompactGameData();
  const tablize = (x: unknown, table: unknown[]) => {
    if (!table.includes(x)) table.push(x);
    return table.indexOf(x);
  };
  const abiT: string[] = [];
  gameData.abilities.forEach((val, key) => {
    abiT.push(key);
    compacted.abilities.push(val);
  });
  const itemT: string[] = [];
  gameData.battleItems.forEach((val, key) => {
    itemT.push(key);
    compacted.items.push({
      name: val.name,
      NAME: key,
    });
  });
  const movesT: string[] = [];
  gameData.moves.forEach((val, key) => {
    movesT.push(key);
    const move = val;
    compacted.moves.push({
      name: move.name,
      NAME: key,
      sName: move.shortName,
      eff: tablize(move.effect, compacted.effT),
      pwr: move.power,
      types: move.types.map((x) => {
        return tablize(x, compacted.typeT);
      }),
      acc: move.acc,
      pp: move.pp,
      chance: move.chance,
      target: tablize(move.target, compacted.targetT),
      prio: move.priority,
      split: tablize(move.split, compacted.splitT),
      flags: move.flags.map((x) => {
        return tablize(x, compacted.flagsT);
      }),
      arg: move.argument,
      desc: move.desc,
      descPtr: move.descPtr,
      lDesc: move.longDesc,
      lDescPtr: move.longDescPtr,
      id: gameData.movesInternalID.get(key) || 0,
      usesHpType: move.usesHpType,
    });
  });
  const NAMET: string[] = [];
  gameData.species.forEach((val) => {
    NAMET.push(val.NAME);
  });
  const nameT: string[] = [];
  compacted.mapsT = gameData.mapTable;
  gameData.species.forEach((val) => {
    const bs = val.baseStats;
    /*let sEnc: CompactedScripted[] = []
    if (gameData.dataScripted.has(val.NAME)){
        gameData.dataScripted.get(val.NAME)?.forEach((value)=>{
            sEnc.push({
                how: tablize(value.how, compacted.scriptedEncoutersHowT),
                map: tablize(value.map, compacted.mapsT)
            })
        })
    }*/
    compacted.species.push({
      name: ((x, X) => {
        if (nameT.includes(x)) {
          // because megas are the same names as the non-megas
          x = Xtox("SPECIES_", X);
        }
        nameT.push(x);
        return x;
      })(val.name, val.NAME),
      NAME: val.NAME,
      stats: {
        base: [
          bs.baseHP,
          bs.baseAttack,
          bs.baseDefense,
          bs.baseSpAttack,
          bs.baseSpDefense,
          bs.baseSpeed,
        ],
        types: bs.types.map((x) => {
          return tablize(x, compacted.typeT);
        }),
        catchR: bs.catchRate,
        exp: bs.expYield,
        EVY: [
          bs.evYield_HP,
          bs.evYield_Attack,
          bs.evYield_Defense,
          bs.evYield_SpAttack,
          bs.evYield_SpDefense,
          bs.evYield_Speed,
        ],
        items: ((x) => {
          if (!x.length) {
            return undefined;
          } else {
            return x;
          }
        })(bs.items),
        gender: bs.genderRatio,
        eggC: bs.eggCycles,
        fren: bs.friendship,
        grow: tablize(bs.growthRate, compacted.growT),
        eggG: bs.eggGroup.map((x) => {
          if (!compacted.eggT.includes(x)) compacted.eggT.push(x);
          return compacted.eggT.indexOf(x);
        }),
        abis: bs.abilities.map((x) => {
          if (!abiT.includes(x)) return 0;
          return abiT.indexOf(x);
        }),
        inns: bs.innates.map((x) => {
          if (!abiT.includes(x)) return 0;
          return abiT.indexOf(x);
        }),
        col: tablize(bs.bodyColor, compacted.colT),
        noFlip: bs.noFlip,
        flags: bs.flags,
      },
      evolutions: val.evolutions.map((x) => {
        const evo = {} as CompactEvolution;
        if (!compacted.evoKindT.includes(x.kind))
          compacted.evoKindT.push(x.kind);
        evo.kd = compacted.evoKindT.indexOf(x.kind);
        evo.rs = x.specifier;
        evo.in = NAMET.indexOf(x.into);
        return evo;
      }),
      eggmoves: val.eggmoves.map((x) => {
        if (!movesT.includes(x)) return 0;
        return movesT.indexOf(x);
      }),
      learnset: val.learnset.map((x) => {
        return {
          id: ((y) => {
            if (!movesT.includes(y)) return 0;
            return movesT.indexOf(y);
          })(x.move),
          lv: x.level,
        };
      }),
      tmhm: val.tmhm.map((x) => {
        x = x.replace(/((TM)|(HM))[^_]+/, "MOVE");
        if (x === "MOVE_SOLARBEAM") x = "MOVE_SOLAR_BEAM";
        if (!movesT.includes(x)) {
          console.warn(`couldn't figure out ${x} TMHM move`);
        }
        return movesT.indexOf(x);
      }),
      tutor: val.tutorMoves.map((x) => {
        if (!movesT.includes(x)) {
          console.warn(`couldn't figure out ${x} tutor move`);
        }
        return movesT.indexOf(x);
      }),
      forms: val.forms.map((x) => {
        return NAMET.indexOf(x);
      }),
      SEnc: [],
      dex: val.dex,
      id: gameData.speciesInternalID.get(val.NAME) || -1,
      sprite: val.sprite,
      lrnPtr: val.lrnPtr,
    });
  });
  compacted.locations = {
    landRate: gameData.locations.landRate,
    waterRate: gameData.locations.waterRate,
    fishRate: gameData.locations.fishRate,
    honeyRate: gameData.locations.honeyRate,
    rockRate: gameData.locations.rockRate,
    hiddenRate: gameData.locations.hiddenRate,
    rodGrade: gameData.locations.rodGrade,
    maps: gameData.locations.maps.map((map) => {
      return {
        name: map.name,
        land: map.land
          ? map.land.map((x) => {
              return [x.min, x.max, NAMET.indexOf(x.specie)];
            })
          : undefined,
        landR: map.landR,
        water: map.water
          ? map.water.map((x) => {
              return [x.min, x.max, NAMET.indexOf(x.specie)];
            })
          : undefined,
        waterR: map.waterR,
        fish: map.fish
          ? map.fish.map((x) => {
              return [x.min, x.max, NAMET.indexOf(x.specie)];
            })
          : undefined,
        fishR: map.fishR,
        honey: map.honey
          ? map.honey.map((x) => {
              return [x.min, x.max, NAMET.indexOf(x.specie)];
            })
          : undefined,
        honeyR: map.honeyR,
        rock: map.rock
          ? map.rock.map((x) => {
              return [x.min, x.max, NAMET.indexOf(x.specie)];
            })
          : undefined,
        rockR: map.rockR,
        hidden: map.hidden
          ? map.hidden.map((x) => {
              return [x.min, x.max, NAMET.indexOf(x.specie)];
            })
          : undefined,
        hiddenR: map.hiddenR,
      };
    }),
  };
  const compactPoke = (poke: TrainerPokemon): CompactTrainerPokemon => {
    const hpType = compacted.typeT.indexOf(Xtox("TYPE_", poke.hpType));
    return {
      spc: NAMET.indexOf(poke.specie),
      abi: poke.ability,
      ivs: poke.ivs,
      evs: poke.evs,
      item: tablize(poke.item, itemT),
      nature: ((nat) => {
        nat = Xtox("NATURE_", nat);
        if (!compacted.natureT.includes(nat)) compacted.natureT.push(nat);
        return compacted.natureT.indexOf(nat);
      })(poke.nature),
      moves: poke.moves.map((mv) => {
        return tablize(mv, movesT);
      }),
      hpType: hpType >= 0 ? hpType : 0,
    };
  };
  const trainerT: string[] = [];
  gameData.trainers.forEach((trainer, key) => {
    if (!trainer.party.length) {
      return;
    }
    compacted.trainers.push({
      name: trainer.realName,
      NAME: key,
      db: trainer.double,
      party: trainer.party.map(compactPoke),
      insane: trainer.insane.map(compactPoke),
      hell: trainer.hell.map(compactPoke),
      rem: trainer.rematches.map((rem) => {
        return {
          db: rem.double,
          party: rem.party.map(compactPoke),
          ptr: rem.ptr,
          NAME: rem.NAME,
          id: gameData.trainerInternalID.get(rem.NAME) || -1,
        };
      }),
      map: -1,
      ptr: trainer.ptr,
      ptrInsane: trainer.ptrInsane,
      tclass: tablize(trainer.tclass, compacted.tclassT),
      music: tablize(trainer.music, compacted.tmusicT),
      gender: trainer.gender,
      pic: tablize(trainer.pic, compacted.tpicT),
      id: gameData.trainerInternalID.get(key) || -1,
      rematchM: trainer.rematchM,
    });
    trainerT.push(key);
  });
  gameData.dataScripted.forEach((val) => {
    const mapName = val.name
      .replace(/_/g, " ")
      .replace(/(?<=[a-z])(?=[A-Z])/g, " ")
      .replace(/(?<=[a-z])(?=[0-9])/g, " ");
    if (compacted.mapsT.indexOf(mapName) == -1) {
      compacted.mapsT.push(mapName);
      compacted.MAPST.push(val.id);
    }
    if (!val.species.length && !val.trainers.length) return;
    const idMap = compacted.mapsT.indexOf(mapName);
    //compacted.MAPST.push(val.id)
    val.species.forEach((value) => {
      if (!compacted.species[NAMET.indexOf(value.spc)]) return;
      compacted.species[NAMET.indexOf(value.spc)].SEnc.push({
        map: idMap,
        how: tablize(value.how, compacted.scriptedEncoutersHowT),
      });
    });
    val.trainers.forEach((value) => {
      if (
        !compacted.trainers[trainerT.indexOf(value)] ||
        compacted.trainers[trainerT.indexOf(value)].map == undefined
      )
        return;
      compacted.trainers[trainerT.indexOf(value)].map = idMap;
    });
  });
  compacted.trainers = compacted.trainers.sort(function (a, b) {
    const aOrder = gameData.trainerOrder.indexOf(
      `${Xtox("TRAINER_CLASS_", compacted.tclassT[a.tclass])} ${a.name}`,
    );
    const bOrder = gameData.trainerOrder.indexOf(
      `${Xtox("TRAINER_CLASS_", compacted.tclassT[b.tclass])} ${b.name}`,
    );
    if (aOrder == -1 && bOrder == -1) return 0;
    if (aOrder == -1) return 1;
    if (bOrder == -1) return -1;
    return aOrder - bOrder;
  });
  compacted.tutors = gameData.tutors.map((val) => movesT.indexOf(val));
  compacted.tmhms = gameData.tmhm.map((val) => movesT.indexOf(val));
  return compacted;
}
