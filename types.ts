export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  libraryId: string;
  password?: string;
  email: string;
  role: UserRole;
  xp: number; 
  badges: string[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  coverImage: string;
  standNumber: string;
  description: string;
  isAvailable: boolean;
  issuedTo?: string; // libraryId
  issuedDate?: string; // ISO string
  waitlist: string[]; 
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export type ViewState = 'HOME' | 'USER_LOGIN' | 'ADMIN_LOGIN' | 'SIGNUP' | 'DASHBOARD';
