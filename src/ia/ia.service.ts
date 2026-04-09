import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class IaService {
  private client: Anthropic;

  constructor(private configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('anthropic.apiKey'),
    });
  }

  /* ── Feedback quiz ── */
  async feedbackQuiz(score: number, questions: any[], reponses: number[]): Promise<string> {
    const details = questions.map((q, i) => ({
      question:       q.question,
      reponseChoisie: q.options[reponses[i]],
      bonneReponse:   q.options[q.reponse],
      correct:        reponses[i] === q.reponse,
    }));

    const message = await this.client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages:   [{
        role:    'user',
        content: `Tu es un formateur expert en débat. Un apprenant a obtenu ${score}% au quiz.
Réponses : ${JSON.stringify(details)}.
Donne un feedback encourageant en français (3-4 phrases), souligne ce qui va bien et donne un conseil précis.`,
      }],
    });

    return (message.content[0] as any).text;
  }

  /* ── Contenu pédagogique ── */
  async genererContenuLecon(sujet: string, niveau: string): Promise<string> {
    const message = await this.client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages:   [{
        role:    'user',
        content: `Expert en formation au débat. Génère une leçon Markdown sur "${sujet}" niveau ${niveau}.
Inclure : introduction, concepts clés, exemple haïtien, points à retenir. Répondre en français.`,
      }],
    });
    return (message.content[0] as any).text;
  }

  /* ── Quiz ── */
  async genererQuiz(sujet: string, nombreQuestions = 5): Promise<any[]> {
    const message = await this.client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages:   [{
        role:    'user',
        content: `Génère ${nombreQuestions} questions de quiz en français sur "${sujet}".
JSON uniquement, sans texte :
[{"question":"...","options":["A","B","C","D"],"reponse":0}]
"reponse" = index (0-3) de la bonne réponse.`,
      }],
    });

    const texte = (message.content[0] as any).text;
    const clean = texte.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  }

  /* ── Analyse argument — SÉCURISÉ côté serveur ── */
  async analyserArgument(
    argument: string,
    contexte: { titreDebat: string; categorie?: string; derniersArguments?: string[] },
  ): Promise<{
    scores: { logique: number; sources: number; persuasion: number };
    pointsForts: string[];
    pointsAmeliorer: string[];
    suggestion: string;
    moduleRecommande: string;
  }> {
    const derniers = contexte.derniersArguments?.slice(-3).join('\n- ') || 'Aucun encore';

    const message = await this.client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages:   [{
        role:    'user',
        content: `Tu es un assistant spécialisé dans l'art du débat.

DÉBAT : ${contexte.titreDebat}
CATÉGORIE : ${contexte.categorie ?? 'Général'}
DERNIERS ARGUMENTS : ${derniers}

Analyse cet argument : "${argument}"

Réponds UNIQUEMENT en JSON valide (sans markdown) :
{
  "scores": { "logique": 7, "sources": 5, "persuasion": 8 },
  "pointsForts": ["Point fort 1", "Point fort 2"],
  "pointsAmeliorer": ["À améliorer 1", "À améliorer 2"],
  "suggestion": "Suggestion concrète",
  "moduleRecommande": "Nom du module de formation recommandé"
}
Sois encourageant mais honnête. Réponds en français.`,
      }],
    });

    const texte = (message.content[0] as any).text;
    const clean = texte.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  }

  /* ── Parcours personnalisé ── */
  async parcoursPersnnalise(niveau: string, pointsFaibles: string[]): Promise<string> {
    const message = await this.client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages:   [{
        role:    'user',
        content: `Formateur en débat. Niveau "${niveau}", difficultés sur : ${pointsFaibles.join(', ')}.
Propose un parcours 5 étapes concrètes, adapté au contexte haïtien, en français.`,
      }],
    });
    return (message.content[0] as any).text;
  }

  /* ── Chatbot assistant ── */
  async chatbot(messageUtilisateur: string): Promise<string> {
    const response = await this.client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 300,
      system:     'Tu es un assistant de la plateforme Debat Haiti. Tu réponds en français de façon concise. Tu aides les utilisateurs à comprendre la plateforme, les débats, les formations, les tournois et les paiements. Si tu ne sais pas, dis de contacter le support.',
      messages:   [{ role: 'user', content: messageUtilisateur }],
    });
    return (response.content[0] as any).text;
  }
}
