import * as FS from "fs";
import * as Path from "path";

import { getFileData } from "./utils";
import * as Moves from "./moves/moves";
import * as Species from "./species/species";
import * as Abilities from "./abilities";
import * as Sprites from "./sprites";
import * as Locations from "./locations";
import * as Trainers from "./trainers/trainers";
import * as ScriptedData from "./scripted_data";
import * as BattleItems from "./battle_items/battle_items";
//import * as Additionnal from './additional_data/additional'
import * as InternalID from "./internal_id";
import { compactify } from "./compactify";
import * as Configuration from "./configuration";
import { getTrainerOrder } from "./trainers/trainer_ordering";
import { create } from "@bufbuild/protobuf";
import { MoveList, MoveListSchema } from "../gen/MoveList_pb.js";
import { AbilityList, AbilityListSchema } from "../gen/AbilityList_pb.js";
import {
  Species as ProtoSpecies,
  SpeciesList,
  SpeciesListSchema,
} from "../gen/SpeciesList_pb.js";
import { SpeciesEnum } from "../gen/SpeciesEnum_pb.js";
import { MoveEnum } from "../gen/MoveEnum_pb.js";
import {
  getUpdatedAbilityMapping,
  getUpdatedItemMapping,
  getUpdatedMoveMapping,
  getUpdatedSpeciesMapping,
  getUpdatedTrainerClassMapping,
  getUpdatedTrainerMapping,
  getUpdatedTrainerMusicMapping,
  getUpdatedTrainerPicMapping,
} from "../proto_compiler.js";
import { AbilityEnum } from "../gen/AbilityEnum_pb.js";
import { ItemEnum } from "../gen/ItemEnum_pb.js";
import { TrainerEnum } from "../gen/TrainerEnum_pb.js";
import {
  TrainerClass,
  TrainerMusic,
  TrainerPic,
} from "../gen/TrainerList_pb.js";
//import { comparify } from './comparify';

export interface GameData {
  speciesEnumMap: Map<SpeciesEnum, string>;
  moveEnumMap: Map<MoveEnum, string>;
  abilityEnumMap: Map<AbilityEnum, string>;
  itemEnumMap: Map<ItemEnum, string>;
  trainerEnumMap: Map<TrainerEnum, string>;
  trainerPicMap: Map<TrainerPic, string>;
  trainerMusicMap: Map<TrainerMusic, string>;
  trainerClassMap: Map<TrainerClass, string>;
  species: Species.Specie[];
  speciesList: SpeciesList;
  speciesMap: Map<SpeciesEnum, ProtoSpecies>;
  abilities: Map<string, Abilities.Ability>;
  abilityList: AbilityList;
  moves: Map<string, Moves.Move>;
  moveList: MoveList;
  locations: Locations.Locations;
  trainers: Map<string, Trainers.Trainer>;
  dataScripted: ScriptedData.Result[];
  mapTable: string[];
  battleItems: Map<string, BattleItems.BattleItem>;
  speciesInternalID: Map<string, number>;
  movesInternalID: Map<string, number>;
  trainerInternalID: Map<string, number>;
  universalTutors: string[];
  universalAttackTutors: string[];
  universalGenderedTutors: string[];
  tutors: string[];
  tmhm: string[];
  trainerOrder: string[];
}

export const gameData: GameData = {
  speciesEnumMap: new Map(),
  moveEnumMap: new Map(),
  abilityEnumMap: new Map(),
  itemEnumMap: new Map(),
  species: [] as Species.Specie[],
  speciesList: create(SpeciesListSchema),
  speciesMap: new Map(),
  abilities: new Map(),
  abilityList: create(AbilityListSchema),
  moves: new Map(),
  moveList: create(MoveListSchema),
  locations: {} as Locations.Locations,
  trainers: new Map(),
  dataScripted: [],
  mapTable: [],
  battleItems: new Map(),
  speciesInternalID: new Map(),
  movesInternalID: new Map(),
  trainerInternalID: new Map(),
  tutors: [],
  tmhm: [],
  trainerOrder: [],
  universalTutors: [],
  universalAttackTutors: [],
  universalGenderedTutors: [],
  trainerEnumMap: new Map(),
  trainerPicMap: new Map(),
  trainerMusicMap: new Map(),
  trainerClassMap: new Map()
};

export function getGameData(window: Electron.BrowserWindow) {
  Configuration.verifyConfiguration()
    .then(() => {
      getGameDataData(window.webContents);
    })
    .catch((err) => {
      //
      console.error("error while verifying the data", err);
      window.webContents.send("no-game-data");
    });
}

function getGlobalH(ROOT_PRJ: string) {
  return getFileData(Path.join(ROOT_PRJ, "include/global.h"), {
    filterComments: true,
    filterMacros: true,
    macros: new Map(),
  });
}

function getGameDataData(webContents: Electron.WebContents) {
  const ROOT_PRJ = Configuration.configuration.project_root;
  getGlobalH(ROOT_PRJ)
    .then(() => {
      const promiseArray: Array<Promise<unknown>> = [];
      gameData.speciesEnumMap = getUpdatedSpeciesMapping(ROOT_PRJ);
      gameData.moveEnumMap = getUpdatedMoveMapping(ROOT_PRJ);
      gameData.abilityEnumMap = getUpdatedAbilityMapping(ROOT_PRJ);
      gameData.itemEnumMap = getUpdatedItemMapping(ROOT_PRJ);
      gameData.trainerEnumMap = getUpdatedTrainerMapping(ROOT_PRJ);
      gameData.trainerPicMap = getUpdatedTrainerPicMapping(ROOT_PRJ);
      gameData.trainerMusicMap = getUpdatedTrainerMusicMapping(ROOT_PRJ);
      gameData.trainerClassMap = getUpdatedTrainerClassMapping(ROOT_PRJ);
      Moves.getMoves(ROOT_PRJ, gameData);
      Species.getSpecies(ROOT_PRJ, gameData);
      Abilities.getAbilities(ROOT_PRJ, gameData);
      promiseArray.push(Locations.getLocations(ROOT_PRJ, gameData));
      Trainers.getTrainers(ROOT_PRJ, gameData);
      promiseArray.push(ScriptedData.parse(ROOT_PRJ, gameData));
      BattleItems.getItems(ROOT_PRJ, gameData);
      gameData.speciesInternalID = new Map(
        [...gameData.speciesEnumMap.entries()].map((it) => [it[1], it[0]]),
      );
      gameData.movesInternalID = new Map(
        [...gameData.moveEnumMap.entries()].map((it) => [it[1], it[0]]),
      );
      promiseArray.push(InternalID.getTrainersInternalID(ROOT_PRJ, gameData));
      promiseArray.push(getTrainerOrder(gameData));
      Promise.allSettled(promiseArray)
        .then((values) => {
          values.map((x) => {
            if (x.status !== "fulfilled") {
              console.error(
                `Something went wrong parsing the data: ${x.reason}`,
              );
              return;
            }
            const result = x.value;
            if (typeof result !== "object") return;
          });
          //Additionnal.getAdditionnalData(ROOT_PRJ, OUTPUT_ADDITIONNAL, gameData)
          const compactGameData = compactify(gameData);
          compactGameData.projet_root = ROOT_PRJ;
          webContents.send("game-data", compactGameData);
        })
        .catch((err) => {
          console.error(`Something went wrong parsing the data: ${err}`);
        });
    })
    .catch((reason) => {
      const err = "Failed at getting global.h reason: " + reason;
      console.error(err);
    });
}

export function getSprites(window: Electron.BrowserWindow) {
  Configuration.verifyConfiguration()
    .then(() => {
      getGetSprites(window.webContents);
    })
    .catch(() => {
      console.error("error while verifying the data");
    });
}

function getGetSprites(_webContents: Electron.WebContents) {
  const ROOT_PRJ = Configuration.configuration.project_root;
  getGlobalH(ROOT_PRJ).then((global_h) => {
    const optionsGlobal_h = {
      filterComments: true,
      filterMacros: true,
      macros: global_h.macros,
    };
    const OUTPUT_SPRITES = Path.join("./out", "sprites/");
    const OUTPUT_PALETTES = "./out/palettes/";
    if (!FS.existsSync(OUTPUT_SPRITES)) FS.mkdirSync(OUTPUT_SPRITES);
    if (!FS.existsSync(OUTPUT_PALETTES)) FS.mkdirSync(OUTPUT_PALETTES);

    Sprites.getSprites(
      Configuration.configuration.project_root,
      optionsGlobal_h,
      OUTPUT_SPRITES,
      OUTPUT_PALETTES,
    )
      .then(() => {
        console.log("Successfully copied the sprites");
      })
      .catch((err) => {
        console.error("error while trying to catch sprites " + err);
      });
  });
}
