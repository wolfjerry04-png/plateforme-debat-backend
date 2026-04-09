import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',   // Le CORS REST est géré dans main.ts — ici on laisse Socket.IO gérer
  },
  namespace: '/debats',
})
export class DebatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DebatsGateway.name);

  // Spectateurs par debatId
  private spectateurs = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connecté : ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté : ${client.id}`);
    // Retirer le client de toutes les rooms
    this.spectateurs.forEach((clients, debatId) => {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        this.broadcastSpectateurs(debatId);
      }
    });
  }

  // Client rejoint un débat
  @SubscribeMessage('rejoindre-debat')
  handleRejoindre(
    @ConnectedSocket() client: Socket,
    @MessageBody() debatId: string,
  ) {
    client.join(`debat:${debatId}`);
    if (!this.spectateurs.has(debatId)) {
      this.spectateurs.set(debatId, new Set());
    }
    this.spectateurs.get(debatId)!.add(client.id);
    this.broadcastSpectateurs(debatId);
    this.logger.log(`Client ${client.id} a rejoint le débat ${debatId}`);
  }

  // Client quitte un débat
  @SubscribeMessage('quitter-debat')
  handleQuitter(
    @ConnectedSocket() client: Socket,
    @MessageBody() debatId: string,
  ) {
    client.leave(`debat:${debatId}`);
    this.spectateurs.get(debatId)?.delete(client.id);
    this.broadcastSpectateurs(debatId);
  }

  // ── Méthodes appelées par les services ──

  // Diffuser un nouveau message à tous les participants du débat
  diffuserNouveauMessage(debatId: string, message: any) {
    this.server.to(`debat:${debatId}`).emit('nouveau-message', message);
  }

  // Diffuser une mise à jour des votes
  diffuserVotesDebat(debatId: string, stats: any) {
    this.server.to(`debat:${debatId}`).emit('votes-mis-a-jour', stats);
  }

  // Diffuser changement de statut d'un débat (ouverture, fermeture)
  diffuserStatutDebat(debatId: string, statut: string) {
    this.server.to(`debat:${debatId}`).emit('statut-debat', { debatId, statut });
  }

  private broadcastSpectateurs(debatId: string) {
    const count = this.spectateurs.get(debatId)?.size ?? 0;
    this.server.to(`debat:${debatId}`).emit('spectateurs', { debatId, count });
  }
}
