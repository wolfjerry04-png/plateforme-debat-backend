import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaiementsService {
  private _stripe: any = null;

  constructor(private readonly prisma: PrismaService, private configService: ConfigService) {}

  private getStripe() {
    if (!this._stripe) {
      const key = this.configService.get<string>('stripe.secretKey') || process.env.STRIPE_SECRET_KEY || '';
      if (key) {
        const StripeLib = require('stripe');
        this._stripe = new StripeLib(key, { apiVersion: '2024-06-20' });
      }
    }
    return this._stripe;
  }

  // Créer une session de paiement Stripe
  async creerSessionStripe(userId: string, plan: string) {
    const prix: Record<string, number> = {
      PREMIUM: 999,      // $9.99/mois
      INSTITUTION: 4999, // $49.99/mois
    };

    if (!prix[plan]) throw new BadRequestException('Plan invalide');

    const session = await this.getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Plateforme Débat Haïti — Plan ${plan}`,
              description: plan === 'PREMIUM'
                ? 'Accès aux cours avancés et replays exclusifs'
                : 'Accès institution pour plusieurs utilisateurs',
            },
            unit_amount: prix[plan],
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${this.configService.get('frontend.url')}/dashboard?success=true`,
      cancel_url: `${this.configService.get('frontend.url')}/premium?cancelled=true`,
      metadata: { userId, plan },
    });

    return { url: session.url, sessionId: session.id };
  }

  // Webhook Stripe — confirmer le paiement
  async handleWebhookStripe(payload: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret') || '';
    let event: any;

    try {
      event = this.getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Signature webhook invalide');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const { userId, plan } = session.metadata || {};

      if (userId && plan) {
        await this.activerAbonnement(userId, plan, session.id);
      }
    }

    return { received: true };
  }

  // Activer l'abonnement premium
  async activerAbonnement(userId: string, plan: string, stripeId: string) {
    const dateFin = new Date();
    dateFin.setMonth(dateFin.getMonth() + 1);

    await this.prisma.abonnement2.upsert({
      where: { userId } as any,
      update: {
        plan: plan as any,
        statut: 'ACTIF',
        dateFin,
        stripeId,
      },
      create: {
        userId,
        plan: plan as any,
        statut: 'ACTIF',
        dateFin,
        stripeId,
        montant: plan === 'PREMIUM' ? 9.99 : 49.99,
      },
    });

    // Notifier l'utilisateur
    await this.prisma.notification.create({
      data: {
        type: 'MENTION',
        titre: `Abonnement ${plan} activé !`,
        contenu: 'Votre abonnement premium est maintenant actif. Profitez de tous les avantages !',
        userId,
      },
    });
  }

  // Paiement MonCash (spécifique Haïti)
  // MonCash est le mobile money de Digicel Haïti
  async initierPaiementMonCash(userId: string, montantHTG: number, plan: string) {
    // MonCash utilise une API REST — voici l'intégration basique
    const moncashApiUrl = this.configService.get<string>('moncash.apiUrl');
    const moncashClientId = this.configService.get<string>('moncash.clientId');
    const moncashSecretKey = this.configService.get<string>('moncash.secretKey');

    // Obtenir le token d'accès MonCash
    const tokenResponse = await fetch(`${moncashApiUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${moncashClientId}:${moncashSecretKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=read,write',
    });

    const { access_token } = await tokenResponse.json() as any;

    // Créer le paiement
    const orderId = `DEBAT-${userId}-${Date.now()}`;
    const paiementResponse = await fetch(`${moncashApiUrl}/v1/CreatePayment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: montantHTG,
        orderId,
      }),
    });

    const paiement = await paiementResponse.json() as any;

    return {
      paymentToken: paiement.payment_token?.token,
      redirectUrl: `https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware/Payment/Redirect?token=${paiement.payment_token?.token}`,
      orderId,
    };
  }

  // Vérifier un paiement MonCash
  async verifierPaiementMonCash(orderId: string) {
    const moncashApiUrl = this.configService.get<string>('moncash.apiUrl');
    const moncashClientId = this.configService.get<string>('moncash.clientId');
    const moncashSecretKey = this.configService.get<string>('moncash.secretKey');

    const tokenResponse = await fetch(`${moncashApiUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${moncashClientId}:${moncashSecretKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=read,write',
    });

    const { access_token } = await tokenResponse.json() as any;

    const response = await fetch(
      `${moncashApiUrl}/v1/RetrieveOrderPayment?orderId=${orderId}`,
      {
        headers: { 'Authorization': `Bearer ${access_token}` },
      },
    );

    return response.json();
  }

  // Vérifier si un utilisateur est premium
  async estPremium(userId: string): Promise<boolean> {
    const abonnement = await this.prisma.abonnement2.findFirst({
      where: {
        userId,
        statut: 'ACTIF',
        dateFin: { gte: new Date() },
      },
    });
    return !!abonnement;
  }

  // ─── ADMIN : Lister tous les abonnements ─────────────────────
  async listerAbonnements() {
    return this.prisma.abonnement2.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, prenom: true, nom: true, email: true, role: true },
        },
      },
    });
  }

  // ─── ADMIN : Valider manuellement un paiement ────────────────
  // Appelé par l'admin après réception d'une capture MonCash/PayPal/Zelle
  async validerPaiementManuellement(
    userId: string,
    plan: string,
    reference: string,
    methode: string = 'MANUEL',
  ) {
    const dateFin = new Date();
    dateFin.setMonth(dateFin.getMonth() + 3); // 3 mois d'accès

    const montant = plan === 'PREMIUM' ? 100 : plan === 'INSTITUTION' ? 200 : 0;

    // Créer ou mettre à jour l'abonnement
    const abonnement = await this.prisma.abonnement2.upsert({
      where: { userId } as any,
      update: {
        plan: plan as any,
        statut: 'ACTIF',
        dateFin,
        stripeId: `${methode}-${reference}`,
        montant,
      },
      create: {
        userId,
        plan: plan as any,
        statut: 'ACTIF',
        dateFin,
        stripeId: `${methode}-${reference}`,
        montant,
      },
    });

    // Notifier l'utilisateur
    await this.prisma.notification.create({
      data: {
        type: 'MENTION',
        titre: `✅ Paiement validé — Plan ${plan}`,
        contenu: `Votre paiement ${methode} (réf: ${reference}) a été validé. Accès premium actif jusqu'au ${dateFin.toLocaleDateString('fr-FR')}.`,
        userId,
      },
    });

    return { message: 'Abonnement activé avec succès', abonnement };
  }

  // ─── ADMIN : Révoquer un abonnement ──────────────────────────
  async revoquerAbonnement(userId: string) {
    await this.prisma.abonnement2.updateMany({
      where: { userId, statut: 'ACTIF' },
      data: { statut: 'ANNULE' },
    });

    await this.prisma.notification.create({
      data: {
        type: 'MENTION',
        titre: '❌ Abonnement annulé',
        contenu: 'Votre abonnement premium a été annulé. Contactez le support pour plus d\'informations.',
        userId,
      },
    });

    return { message: 'Abonnement révoqué' };
  }
}
