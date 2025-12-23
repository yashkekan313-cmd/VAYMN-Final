
import { createClient } from '@supabase/supabase-js';
import { Book, User } from '../types';
import { INITIAL_BOOKS, INITIAL_USERS, INITIAL_ADMINS } from '../data';

const SUPABASE_URL = 'https://qkenvdlwtsbvneivbath.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZW52ZGx3dHNidm5laXZiYXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMzEzMDAsImV4cCI6MjA4MTgwNzMwMH0.8-U_pWpEmIiU9noTzGOnPQfJyxmNnWyPS6vycRlLgjk';

const supabase = (
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  (SUPABASE_URL as string) !== 'YOUR_SUPABASE_URL' &&
  (SUPABASE_ANON_KEY as string).length > 20
) ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

class DatabaseService {
  public isCloudEnabled(): boolean {
    return !!supabase;
  }

  async seedIfEmpty() {
    if (!this.isCloudEnabled()) return;
    try {
      const { count, error } = await supabase!.from('books').select('*', { count: 'exact', head: true });
      if (!error && (count === 0 || count === null)) {
        await this.forceSeed();
      }
    } catch (e) {
      console.warn("Seeding skipped.");
    }
  }

  async forceSeed() {
    localStorage.setItem('vaymn_books', JSON.stringify(INITIAL_BOOKS));
    localStorage.setItem('vaymn_users', JSON.stringify(INITIAL_USERS));
    localStorage.setItem('vaymn_admins', JSON.stringify(INITIAL_ADMINS));

    if (this.isCloudEnabled()) {
      try {
        await Promise.all([
          supabase!.from('books').upsert(INITIAL_BOOKS),
          supabase!.from('users').upsert(INITIAL_USERS),
          supabase!.from('admins').upsert(INITIAL_ADMINS)
        ]);
      } catch (e) {
        console.error("Cloud seed error:", e);
      }
    }
    return { books: INITIAL_BOOKS, users: INITIAL_USERS, admins: INITIAL_ADMINS };
  }

  async clearAndReset() {
    localStorage.removeItem('vaymn_books');
    localStorage.removeItem('vaymn_users');
    localStorage.removeItem('vaymn_admins');
    return this.forceSeed();
  }

  async getBooks(): Promise<Book[]> {
    if (this.isCloudEnabled()) {
      try {
        const { data, error } = await supabase!.from('books').select('*').order('title');
        if (!error && data && data.length > 0) {
          localStorage.setItem('vaymn_books', JSON.stringify(data));
          return data as Book[];
        }
      } catch (e) {}
    }
    const saved = localStorage.getItem('vaymn_books');
    return saved ? JSON.parse(saved) : INITIAL_BOOKS;
  }

  async getUsers(): Promise<User[]> {
    if (this.isCloudEnabled()) {
      try {
        const { data, error } = await supabase!.from('users').select('*').order('name');
        if (!error && data && data.length > 0) {
          localStorage.setItem('vaymn_users', JSON.stringify(data));
          return data as User[];
        }
      } catch (e) {}
    }
    const saved = localStorage.getItem('vaymn_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  }

  async getAdmins(): Promise<User[]> {
    if (this.isCloudEnabled()) {
      try {
        const { data, error } = await supabase!.from('admins').select('*').order('name');
        if (!error && data && data.length > 0) {
          localStorage.setItem('vaymn_admins', JSON.stringify(data));
          return data as User[];
        }
      } catch (e) {}
    }
    const saved = localStorage.getItem('vaymn_admins');
    return saved ? JSON.parse(saved) : INITIAL_ADMINS;
  }

  async updateBook(book: Book): Promise<void> {
    const current = await this.getBooks();
    const updated = current.map(b => b.id === book.id ? book : b);
    if (!current.find(b => b.id === book.id)) updated.push(book);
    localStorage.setItem('vaymn_books', JSON.stringify(updated));
    if (this.isCloudEnabled()) {
      try { await supabase!.from('books').upsert(book); } catch (e) {}
    }
  }

  async deleteBook(id: string): Promise<void> {
    const current = await this.getBooks();
    localStorage.setItem('vaymn_books', JSON.stringify(current.filter(b => b.id !== id)));
    if (this.isCloudEnabled()) {
      try { await supabase!.from('books').delete().eq('id', id); } catch (e) {}
    }
  }

  async updateUser(user: User): Promise<void> {
    const current = await this.getUsers();
    localStorage.setItem('vaymn_users', JSON.stringify([...current.filter(u => u.id !== user.id), user]));
    if (this.isCloudEnabled()) {
      try { await supabase!.from('users').upsert(user); } catch (e) {}
    }
  }

  async deleteUser(id: string): Promise<void> {
    const current = await this.getUsers();
    localStorage.setItem('vaymn_users', JSON.stringify(current.filter(u => u.id !== id)));
    if (this.isCloudEnabled()) {
      try { await supabase!.from('users').delete().eq('id', id); } catch (e) {}
    }
  }

  async updateAdmin(admin: User): Promise<void> {
    const current = await this.getAdmins();
    localStorage.setItem('vaymn_admins', JSON.stringify([...current.filter(a => a.id !== admin.id), admin]));
    if (this.isCloudEnabled()) {
      try { await supabase!.from('admins').upsert(admin); } catch (e) {}
    }
  }

  async deleteAdmin(id: string): Promise<void> {
    const current = await this.getAdmins();
    localStorage.setItem('vaymn_admins', JSON.stringify(current.filter(a => a.id !== id)));
    if (this.isCloudEnabled()) {
      try { await supabase!.from('admins').delete().eq('id', id); } catch (e) {}
    }
  }

  async saveAllBooks(books: Book[]) {
    localStorage.setItem('vaymn_books', JSON.stringify(books));
    if (this.isCloudEnabled()) {
      try { await supabase!.from('books').upsert(books); } catch (e) {}
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const saved = localStorage.getItem('vaymn_session');
    return saved ? JSON.parse(saved) : null;
  }

  async saveSession(user: User | null): Promise<void> {
    localStorage.setItem('vaymn_session', JSON.stringify(user));
  }
}

export const db = new DatabaseService();
