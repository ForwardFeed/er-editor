import { ipcMain } from "electron";
import { getGameData } from "./app/main";
import { askForFolder } from "./app/configuration";
import { setLocation, locationCQ } from "./app/locations";
import { Evolution } from "./app/species/evolutions";
import { TrainerPokemon } from "./app/trainers/teams";
import { Trainer } from "./app/trainers/trainers";
import { LevelUpMove } from "./app/species/level_up_learnsets";
import { canRunProto, checkProtoExistence } from "./proto_compiler";
import {
  udpateSpeciesType,
  updateAbilities,
  updateBaseStats,
  updateEvos,
  updateLearnset,
  updateSpeciesDescription,
  updateTutors,
} from "./app/species/species_writer.js";
import {
  addElite,
  addHell,
  removeElite,
  removeHell,
  removeTrainer,
  renameTrainerEnum,
  udpateTrainerParty,
  updateTrainer,
} from "./app/trainers/trainer_writer.js";

export function setupApi(window: Electron.BrowserWindow) {
  ipcMain.on("get-game-data", () => {
    getGameData(window);
  });
  ipcMain.on("ask-for-folder", () => {
    askForFolder(window);
  });
  ipcMain.on(
    "set-location",
    (
      _event,
      mapName: string,
      field: string,
      monID: number,
      key: string,
      value: string | number,
    ) => {
      locationCQ
        .feed(() => {
          setLocation(mapName, field, monID, key, value);
        })
        .poll();
    },
  );

  ipcMain.on(
    "mod-trainer-party",
    (_event, ptr: string, party: TrainerPokemon[]) =>
      udpateTrainerParty(ptr, party),
  );
  ipcMain.on("mod-trainer", (_event, trainer: Trainer) =>
    updateTrainer(trainer),
  );
  ipcMain.on("rm-insane", (_event, tNAME: string) => removeElite(tNAME));
  ipcMain.on(
    "add-insane",
    (_event, tNAME: string, insaneParty: TrainerPokemon[]) =>
      addElite(tNAME, insaneParty),
  );
  ipcMain.on("rm-hell", (_event, tNAME: string) => removeHell(tNAME));
  ipcMain.on("add-hell", (_event, tNAME: string, hellParty: TrainerPokemon[]) =>
    addHell(tNAME, hellParty),
  );
  ipcMain.on("remove-trainer", (_event, tNAME: string) => removeTrainer(tNAME));
  ipcMain.on("rename-trainer", (_event, oldName: string, newName: string) =>
    renameTrainerEnum(oldName, newName),
  );

  const targetChangeMove = { tutor: updateTutors };
  ipcMain.on(
    "change-moves",
    (_event, target: string, specie: string, moves: string[]) => {
      const targetCall = targetChangeMove[target];
      if (targetCall) targetCall(specie, moves);
    },
  );
  ipcMain.on(
    "change-learnset",
    (_event, specie: string, moves: LevelUpMove[]) => {
      updateLearnset(specie, moves);
    },
  );
  ipcMain.on(
    "change-abis",
    (_event, specie: string, field: "abis" | "inns", abis: string[]) => {
      updateAbilities(specie, field, abis);
    },
  );
  ipcMain.on("change-bs", (_event, specie: string, values: number[]) => {
    updateBaseStats(specie, values);
  });
  ipcMain.on(
    "change-spc-type",
    (_event, specie: string, types: [string, string]) => {
      udpateSpeciesType(specie, types);
    },
  );
  ipcMain.on("change-spc-desc", (_event, specie: string, desc: string) => {
    updateSpeciesDescription(specie, desc);
  });
  ipcMain.on(
    "change-evolution",
    (_event, specie: string, evos: Evolution[]) => {
      updateEvos(specie, evos);
    },
  );

  ipcMain.on("check-protoc", (_event) => {
    try {
      checkProtoExistence();
      const version = canRunProto();
      window.webContents.send("protoc-ok", version);
    } catch (e) {
      window.webContents.send("protoc-err", e);
    }
  });
}
