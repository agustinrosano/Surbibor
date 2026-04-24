import { io, Socket } from 'socket.io-client';

export interface NetworkPlayer {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  charType: string;
  anim: number;
}

export class NetworkManager {
  private socket: Socket;
  public isHost: boolean = false;
  public roomId: string | null = null;
  public players: Map<string, NetworkPlayer> = new Map();
  
  // Callbacks for the engine
  public onPlayerJoined?: (p: NetworkPlayer) => void;
  public onPlayerLeft?: (id: string) => void;
  public onEnemySync?: (data: any) => void;

  constructor(serverUrl: string = 'http://localhost:3000') {
    this.socket = io(serverUrl, { autoConnect: false });
    this.setupListeners();
  }

  private setupListeners() {
    this.socket.on('player-joined', (allPlayers: Record<string, NetworkPlayer>) => {
      // The first player in the room is the host (simple logic)
      const ids = Object.keys(allPlayers);
      if (ids[0] === this.socket.id) {
        this.isHost = true;
      }

      for (const id in allPlayers) {
        if (id !== this.socket.id) {
          const p = allPlayers[id];
          this.players.set(id, p);
          if (this.onPlayerJoined) this.onPlayerJoined(p);
        }
      }
    });

    this.socket.on('player-moved', (data: any) => {
      if (this.players.has(data.id)) {
        const p = this.players.get(data.id)!;
        p.x = data.x;
        p.y = data.y;
        p.anim = data.anim;
        p.hp = data.hp;
      }
    });

    this.socket.on('player-left', (id: string) => {
      this.players.delete(id);
      if (this.onPlayerLeft) this.onPlayerLeft(id);
    });

    this.socket.on('enemies-update', (data: any) => {
      if (!this.isHost && this.onEnemySync) {
        this.onEnemySync(data);
      }
    });
  }

  public joinRoom(roomId: string, playerData: any) {
    this.roomId = roomId;
    this.socket.connect();
    this.socket.emit('join-room', roomId, playerData);
  }

  public sendMovement(data: any) {
    if (this.roomId) {
      this.socket.emit('player-move', this.roomId, data);
    }
  }

  public syncEnemies(enemies: any[]) {
    if (this.isHost && this.roomId) {
      this.socket.emit('sync-enemies', this.roomId, enemies);
    }
  }

  public get id() {
    return this.socket.id;
  }
}
