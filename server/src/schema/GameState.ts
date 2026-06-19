import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class PlayerState extends Schema {
    @type("string")  sessionId: string = "";
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
    @type("int8")    health: number = 5;
    @type("int32")   kills: number = 0;
    @type("int16")   level: number = 1;
    @type("int32")   experience: number = 0;
    @type("int32")   experienceToNext: number = 5;
    @type("int32")   wood: number = 0;
    @type("boolean") isDead: boolean = false;
    @type("float32") reviveProgress: number = 0;
    @type("string")  facingDirection: string = "N";
    @type("string")  attackDirection: string = "N";
    @type("int8")    activeSlot: number = 1;
    @type("string")  activeItem: string = "wood_axe";
    @type("string")  attackItem: string = "wood_axe";
    @type("int32")   attackSeq: number = 0;
    @type("boolean") bowCharging: boolean = false;
    @type("float32") bowChargeProgress: number = 0;
    @type("int32")   bowChargeSeq: number = 0;
    @type("int16")   pendingUpgradeChoices: number = 0;
    @type("int16")   axeSwingSpeedUpgrades: number = 0;
    @type("int16")   axeTreeDamageUpgrades: number = 0;
    @type("int16")   axeEnemyDamageUpgrades: number = 0;
    @type("int16")   bowDamageUpgrades: number = 0;
    @type("int16")   bowPierceUpgrades: number = 0;
    @type("int16")   bowChargeTimeUpgrades: number = 0;
    @type("int16")   barricadeHealthUpgrades: number = 0;
    @type("int16")   woodGatherUpgrades: number = 0;
    @type("int16")   campfireUpgrades: number = 0;
    @type("int16")   pendingCampfireCharges: number = 0;
    @type(["string"]) hotbarItems = new ArraySchema<string>();
    @type(["int16"])  hotbarCounts = new ArraySchema<number>();
}

export class EnemyState extends Schema {
    @type("string")  id: string = "";
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
    @type("int8")    shipId: number = 0;
    @type("int8")    enemyType: number = 1;
    @type("int8")    power: number = 1;
    @type("int8")    health: number = 1;
    @type("int8")    maxHealth: number = 3;
    @type("string")  facingDirection: string = "S";
    @type("string")  action: string = "run";
    @type("int32")   attackSeq: number = 0;
    @type("int32")   damageSeq: number = 0;
    @type("boolean") isDead: boolean = false;
    @type("int32")   deathSeq: number = 0;
}

export class PlayerBulletState extends Schema {
    @type("string")  id: string = "";
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
    @type("int8")    power: number = 1;
    @type("string")  ownerId: string = "";
    @type("string")  kind: string = "bullet";
    @type("float32") angle: number = 0;
}

export class EnemyBulletState extends Schema {
    @type("string")  id: string = "";
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
    @type("int8")    power: number = 1;
    @type("string")  kind: string = "bullet";
    @type("float32") angle: number = 0;
}

export class TreeState extends Schema {
    @type("string")  id: string = "";
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
}

export class LogState extends Schema {
    @type("string")  id: string = "";
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
    @type("int8")    amount: number = 5;
}

export class WoodBlockState extends Schema {
    @type("string")  id: string = "";
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
    @type("int8")    health: number = 5;
    @type("int8")    maxHealth: number = 5;
}

export class CampfireState extends Schema {
    @type("string")  id: string = "";
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
}

export class GameRoomState extends Schema {
    @type({ map: PlayerState })       players      = new MapSchema<PlayerState>();
    @type({ map: EnemyState })        enemies      = new MapSchema<EnemyState>();
    @type({ map: PlayerBulletState }) playerBullets = new MapSchema<PlayerBulletState>();
    @type({ map: EnemyBulletState })  enemyBullets  = new MapSchema<EnemyBulletState>();
    @type({ map: TreeState })         trees         = new MapSchema<TreeState>();
    @type({ map: LogState })          logs          = new MapSchema<LogState>();
    @type({ map: WoodBlockState })    woodBlocks    = new MapSchema<WoodBlockState>();
    @type({ map: CampfireState })     campfires     = new MapSchema<CampfireState>();

    @type("int32")  worldWidth:  number = 3840;
    @type("int32")  worldHeight: number = 2160;

    @type("int32")   elapsedSeconds: number = 0;
    @type("int32")   teamScore:   number  = 0;
    @type("boolean") gameStarted: boolean = false;
    @type("boolean") gameOver:    boolean = false;
    @type("int8")    gameOverCountdown: number = 0;
}
