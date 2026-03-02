import { Schema, type, MapSchema } from "@colyseus/schema";

export class PlayerState extends Schema {
    @type("string")  sessionId: string = "";
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
    @type("int8")    health: number = 1;
    @type("int32")   kills: number = 0;
    @type("boolean") isDead: boolean = false;
}

export class EnemyState extends Schema {
    @type("string")  id: string = "";
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
    @type("int8")    shipId: number = 0;
    @type("int8")    power: number = 1;
    @type("int8")    health: number = 1;
}

export class PlayerBulletState extends Schema {
    @type("string")  id: string = "";
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
    @type("int8")    power: number = 1;
    @type("string")  ownerId: string = "";
}

export class EnemyBulletState extends Schema {
    @type("string")  id: string = "";
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
    @type("int8")    power: number = 1;
}

export class GameRoomState extends Schema {
    @type({ map: PlayerState })       players      = new MapSchema<PlayerState>();
    @type({ map: EnemyState })        enemies      = new MapSchema<EnemyState>();
    @type({ map: PlayerBulletState }) playerBullets = new MapSchema<PlayerBulletState>();
    @type({ map: EnemyBulletState })  enemyBullets  = new MapSchema<EnemyBulletState>();

    @type("int32")   teamScore:   number  = 0;
    @type("boolean") gameStarted: boolean = false;
    @type("boolean") gameOver:    boolean = false;
}
