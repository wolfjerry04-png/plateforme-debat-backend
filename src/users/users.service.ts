// src/users/users.service.ts
// Logique métier liée aux utilisateurs
// Communique avec la base de données via Prisma

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  // Instance Prisma pour accéder à la base de données

  // Trouver un utilisateur par son email (utilisé lors de la connexion)
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Trouver un utilisateur par son ID
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        role: true,
        actif: true,
        createdAt: true,
        // On n'inclut JAMAIS le mot de passe dans les réponses
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user;
  }

  // Créer un nouvel utilisateur (appelé lors de l'inscription)
  async create(data: {
    email: string;
    motDePasse: string;
    prenom: string;
    nom: string;
    role?: Role;
  }) {
    // Hachage du mot de passe avant sauvegarde (jamais en clair en base)
    const motDePasseHache = await bcrypt.hash(data.motDePasse, 12);

    return this.prisma.user.create({
      data: {
        ...data,
        motDePasse: motDePasseHache,
      },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        role: true,
        createdAt: true,
        // Mot de passe exclu de la réponse
      },
    });
  }

  // Vérifier si un mot de passe correspond au hash en base
  async verifierMotDePasse(motDePasse: string, hash: string): Promise<boolean> {
    return bcrypt.compare(motDePasse, hash);
  }
}