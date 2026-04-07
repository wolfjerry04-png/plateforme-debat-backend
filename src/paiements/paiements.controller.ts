import {
  Controller, Post, Get, Patch, Body, Headers, Param,
  RawBodyRequest, Req, Request, UseGuards,
} from '@nestjs/common';
import { PaiementsService } from './paiements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('paiements')
export class PaiementsController {
  constructor(private readonly paiementsService: PaiementsService) {}

  // POST /api/paiements/stripe/session
  @UseGuards(JwtAuthGuard)
  @Post('stripe/session')
  async creerSession(@Request() req: any, @Body() body: { plan: string }) {
    return this.paiementsService.creerSessionStripe(req.user.id, body.plan);
  }

  // POST /api/paiements/stripe/webhook — appelé par Stripe
  @Post('stripe/webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paiementsService.handleWebhookStripe(
      req.rawBody as Buffer,
      signature,
    );
  }

  // POST /api/paiements/moncash/initier
  @UseGuards(JwtAuthGuard)
  @Post('moncash/initier')
  async initierMoncash(
    @Request() req: any,
    @Body() body: { montantHTG: number; plan: string },
  ) {
    return this.paiementsService.initierPaiementMonCash(
      req.user.id,
      body.montantHTG,
      body.plan,
    );
  }

  // GET /api/paiements/statut
  @UseGuards(JwtAuthGuard)
  @Get('statut')
  async getStatut(@Request() req: any) {
    const premium = await this.paiementsService.estPremium(req.user.id);
    return { premium };
  }

  // GET /api/paiements/moncash/verifier
  @UseGuards(JwtAuthGuard)
  @Get('moncash/verifier')
  async verifierMoncash(@Body() body: { orderId: string }) {
    return this.paiementsService.verifierPaiementMonCash(body.orderId);
  }

  // ─── ADMIN ───────────────────────────────────────────────────

  // GET /api/paiements/admin/liste — lister tous les abonnements
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/liste')
  async listerAbonnements() {
    return this.paiementsService.listerAbonnements();
  }

  // POST /api/paiements/admin/valider — valider manuellement un paiement
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/valider')
  async validerManuellement(
    @Body() body: { userId: string; plan: string; reference: string; methode: string },
  ) {
    return this.paiementsService.validerPaiementManuellement(
      body.userId,
      body.plan,
      body.reference,
      body.methode,
    );
  }

  // PATCH /api/paiements/admin/revoquer/:userId — révoquer un abonnement
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/revoquer/:userId')
  async revoquerAbonnement(@Param('userId') userId: string) {
    return this.paiementsService.revoquerAbonnement(userId);
  }
}
