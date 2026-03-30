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

        // Buscar usuario en la base de datos
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.active) {
          throw new Error('Credenciales inválidas');
        }

        // Verificar contraseña
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
      },
    }),
  ],
  callbacks: {
    // Incluir el rol y comunidadId del usuario en el JWT
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.comunidadId = (user as any).comunidadId;
      }
      return token;
    },
    // Incluir el rol y comunidadId del usuario en la sesión
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).comunidadId = token.comunidadId;
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
  trustHost: true,
};
