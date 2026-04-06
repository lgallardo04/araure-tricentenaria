// =============================================================
// Configuración de NextAuth.js
// Autenticación con credenciales (email/password) y JWT
// Incluye role y comunidadId en la sesión
// =============================================================

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credenciales',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos');
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            throw new Error('Credenciales inválidas');
          }

          if (!user.active) {
            throw new Error('Credenciales inválidas');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            throw new Error('Credenciales inválidas');
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            comunidadId: user.comunidadId,
          };
        } catch (error: unknown) {
          if (error instanceof Error && error.message === 'Credenciales inválidas') {
            throw error;
          }
          if (error instanceof Error && error.message === 'Email y contraseña son requeridos') {
            throw error;
          }
          console.error('[AUTH]:', error);
          throw new Error('Credenciales inválidas');
        }
      },
    }),
  ],
  callbacks: {
    // Incluir el rol y comunidadId del usuario en el JWT
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.comunidadId = user.comunidadId ?? null;
      }
      return token;
    },
    // Incluir el rol y comunidadId del usuario en la sesión
    async session({ session, token }) {
      if (session.user && token.id && token.role !== undefined) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.comunidadId = token.comunidadId ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 horas
  },
  secret: process.env.NEXTAUTH_SECRET,
  // @ts-ignore
  trustHost: true,
};
