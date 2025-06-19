import { gameData } from "../main";
import { configuration } from "../configuration";
import { writeTrainerEnums, writeTrainers } from "../../proto_compiler";
import { clone, create } from "@bufbuild/protobuf";
import { Species_Gender } from "../../gen/SpeciesList_pb.js";
import { CallQueue } from "../../call_queue.js";
import { Type } from "../../gen/Types_pb.js";
import { TrainerPokemon } from "./teams.js";
import {
  TrainerList,
  TrainerListSchema,
  TrainerParty,
  TrainerParty_TrainerMon_Nature,
  TrainerParty_TrainerMonSchema,
  TrainerPartySchema,
  TrainerSchema,
} from "../../gen/TrainerList_pb.js";
import { Trainer } from "./trainers.js";
import { TrainerEnum } from "../../gen/TrainerEnum_pb.js";
import { inspect } from "util";

function invertMap<K, V>(map: Map<K, V>): Map<V, K> {
  return new Map([...map.entries()].map((it) => [it[1], it[0]]));
}

let pendingEnums: Map<TrainerEnum, string> | undefined = undefined;
let pendingTrainers: TrainerList | undefined = undefined;
const TrainerCQ = new CallQueue("Trainers");
function markEnumDirty() {
  pendingEnums = new Map(gameData.trainerEnumMap.entries());
  markMaybeDirty();
}
function markTrainersDirty() {
  pendingTrainers = clone(TrainerListSchema, gameData.trainerList);
  markMaybeDirty();
}
function markMaybeDirty() {
  if (!TrainerCQ.queue.length) {
    TrainerCQ.feed(() => {
      while (pendingEnums || pendingTrainers) {
        if (pendingEnums) {
          const enums = pendingEnums;
          pendingEnums = undefined;
          writeTrainerEnums(configuration.project_root, enums);
          continue;
        }
        if (!pendingEnums && pendingTrainers) {
          const trainers = pendingTrainers;
          pendingTrainers = undefined;
          writeTrainers(configuration.project_root, trainers);
        }
      }
    }).poll();
  }
}

export function udpateTrainerParty(
  identifier: string,
  party: TrainerPokemon[],
) {
  const [type, id] = identifier.split("|");

  const trainerEnum = invertMap(gameData.trainerEnumMap).get(id)!!;
  const trainer = gameData.trainerMap.get(trainerEnum)!!;

  let trainerParty: TrainerParty;

  switch (type) {
    case "HELL":
      if (!trainer.hell) trainer.hell = create(TrainerPartySchema);
      trainerParty = trainer.hell;
      break;
    case "ELITE":
      if (!trainer.elite) trainer.elite = create(TrainerPartySchema);
      trainerParty = trainer.elite;
      break;
    case "ACE":
      if (!trainer.ace) trainer.ace = create(TrainerPartySchema);
      trainerParty = trainer.ace;
      break;
    default:
      throw new Error(`Unhandled trainer ${identifier}`);
  }

  const speciesMap = invertMap(gameData.speciesEnumMap);
  const itemMap = invertMap(gameData.itemEnumMap);
  const moveMap = invertMap(gameData.moveEnumMap);

  trainerParty.mon = party.map((it) =>
    create(TrainerParty_TrainerMonSchema, {
      species: speciesMap.get(it.specie),
      item: itemMap.get(it.item),
      nature:
        TrainerParty_TrainerMon_Nature[
          it.nature.replace("NATURE_", "").toUpperCase()
        ],
      hpEv: it.evs[0],
      atkEv: it.evs[1],
      defEv: it.evs[2],
      spatkEv: it.evs[3],
      spdefEv: it.evs[4],
      speEv: it.evs[5],
      ability: gameData.speciesMap.get(speciesMap.get(it.specie)!!)!!.ability[
        it.ability
      ],
      ironPill: !it.ivs[5],
      move: it.moves.map((move) => moveMap.get(move)!!),
      hiddenPowerType: Type[it.hpType.replace("TYPE_", "").toUpperCase()],
    }),
  );

  markTrainersDirty();
}

export function updateTrainer(trainer: Trainer) {
  console.log(inspect(trainer, {}));
  const trainerEnum = invertMap(gameData.trainerEnumMap).get(trainer.NAME)!!;
  const trainerRef = gameData.trainerMap.get(trainerEnum)!!;

  trainerRef.music = invertMap(gameData.trainerMusicMap).get(trainer.music);
  trainerRef.pic = invertMap(gameData.trainerPicMap).get(trainer.pic);
  trainerRef.forcedDouble = trainer.double;
  trainerRef.gender = trainer.gender
    ? Species_Gender.FEMALE
    : Species_Gender.MALE;
  trainerRef.class = invertMap(gameData.trainerClassMap).get(trainer.tclass);
  trainerRef.name = trainer.name;

  markTrainersDirty();
}

export function removeElite(id: string) {
  const trainerEnum = invertMap(gameData.trainerEnumMap).get(id)!!;
  const trainer = gameData.trainerMap.get(trainerEnum)!!;
  trainer.elite = undefined;

  markTrainersDirty();
}

export function addElite(id: string, pokemon: TrainerPokemon[]) {
  const trainerEnum = invertMap(gameData.trainerEnumMap).get(id)!!;
  const trainer = gameData.trainerMap.get(trainerEnum)!!;
  trainer.elite = create(TrainerPartySchema);

  udpateTrainerParty("ELITE|" + id, pokemon);
}

export function removeHell(id: string) {
  const trainerEnum = invertMap(gameData.trainerEnumMap).get(id)!!;
  const trainer = gameData.trainerMap.get(trainerEnum)!!;
  trainer.hell = undefined;

  markTrainersDirty();
}

export function addHell(id: string, pokemon: TrainerPokemon[]) {
  const trainerEnum = invertMap(gameData.trainerEnumMap).get(id)!!;
  const trainer = gameData.trainerMap.get(trainerEnum)!!;

  trainer.hell = create(TrainerPartySchema);

  udpateTrainerParty("HELL|" + id, pokemon);
}

export function removeTrainer(id: string) {
  const trainerId = invertMap(gameData.trainerEnumMap).get(id)!!;
  gameData.trainerMap.delete(trainerId);
  gameData.trainerEnumMap.delete(trainerId);
  gameData.trainerList.trainer = gameData.trainerList.trainer.filter(
    (it) => it.id !== trainerId,
  );

  markEnumDirty();
  markTrainersDirty();
}

export function addTrainer(trainer: Trainer) {
  let currentIds: TrainerEnum[] = [];
  for (const id of gameData.trainerEnumMap.keys()) {
    if (id !== TrainerEnum.TRAINER_OLDPLAYER) currentIds.push(id);
  }
  currentIds.sort();
  const newId = (currentIds.findIndex((value, idx) => value !== idx) + 1 ||
    currentIds.length) as TrainerEnum;

  markEnumDirty();

  gameData.trainerEnumMap.set(newId, trainer.NAME);
  const newTrainer = create(TrainerSchema, { id: newId });
  gameData.trainerList.trainer.push(newTrainer);
  gameData.trainerMap.set(newId, newTrainer);
  updateTrainer(trainer);
}

export function renameTrainerEnum(oldValue: string, newValue: string) {
  const trainerId = invertMap(gameData.trainerEnumMap).get(oldValue)!!;
  gameData.trainerEnumMap.set(trainerId, newValue);

  markEnumDirty();
  markTrainersDirty();
}
