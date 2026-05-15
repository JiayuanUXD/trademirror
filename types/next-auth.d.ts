import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      mustChangePassword?: boolean;
    };
  }

  interface User {
    role?: string;
    passwordChangedAt?: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    passwordChangedAt?: number | null;
  }
}
