import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import api from './api';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    nombre: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      nombre: string;
      role: string;
    };
  }

  interface User {
    id: string;
    email: string;
    nombre: string;
    role: string;
    accessToken: string;
    refreshToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    nombre: string;
    role: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos');
        }

        try {
          const response = await api.post<AuthResponse>('/auth/login', {
            email: credentials.email,
            password: credentials.password,
          });

          const { user, accessToken, refreshToken } = response;

          if (!user || !accessToken) {
            throw new Error('Credenciales inválidas');
          }

          return {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            role: user.role,
            accessToken,
            refreshToken,
          };
        } catch {
          throw new Error('Credenciales inválidas');
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.nombre = user.nombre;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = Date.now() + 60 * 60 * 1000;
      }

      if (Date.now() < token.accessTokenExpires) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        nombre: token.nombre,
        role: token.role,
      };
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
};

async function refreshAccessToken(token: {
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;
  [key: string]: unknown;
}) {
  try {
    const response = await api.post<{
      accessToken: string;
      refreshToken: string;
    }>('/auth/refresh', {
      refreshToken: token.refreshToken,
    });

    return {
      ...token,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken ?? token.refreshToken,
      accessTokenExpires: Date.now() + 60 * 60 * 1000,
    };
  } catch {
    return {
      ...token,
      accessTokenExpires: 0,
    };
  }
}

export async function login(email: string, password: string) {
  const response = await api.post<AuthResponse>('/auth/login', {
    email,
    password,
  });
  return response;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Swallow logout errors
  }
}
