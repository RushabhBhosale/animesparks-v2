import type { CharacterProfile, SeriesData } from '../types.ts';
import { jujutsuKaisen } from './series/jujutsu-kaisen.ts';
import { naruto } from './series/naruto.ts';
import { onePiece } from './series/one-piece.ts';
import { demonSlayer } from './series/demon-slayer.ts';
import { gojoSatoru } from './profiles/gojo-satoru.ts';
import { yujiItadori } from './profiles/yuji-itadori.ts';
import { megumiFushiguro } from './profiles/megumi-fushiguro.ts';
import { ryomenSukuna } from './profiles/ryomen-sukuna.ts';
import { narutoUzumaki } from './profiles/naruto-uzumaki.ts';
import { sasukeUchiha } from './profiles/sasuke-uchiha.ts';
import { itachiUchiha } from './profiles/itachi-uchiha.ts';
import { monkeyDLuffy } from './profiles/monkey-d-luffy.ts';
import { portgasDAce } from './profiles/portgas-d-ace.ts';
import { tanjiroKamado } from './profiles/tanjiro-kamado.ts';
import { kyojuroRengoku } from './profiles/kyojuro-rengoku.ts';

export const SERIES: SeriesData[] = [jujutsuKaisen, naruto, onePiece, demonSlayer];
export const PROFILES: CharacterProfile[] = [gojoSatoru, yujiItadori, megumiFushiguro, ryomenSukuna, narutoUzumaki, sasukeUchiha, itachiUchiha, monkeyDLuffy, portgasDAce, tanjiroKamado, kyojuroRengoku];
