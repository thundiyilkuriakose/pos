import { create } from 'zustand';

export type UserRole = 'owner' | 'manager' | 'staff' | 'cashier' | 'waiter';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, role: User['role']) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  login: (email, role) => {
    // Generate simple mock user session
    const mockUser: User = {
      id: 'staff:OUT001:01J5KXYZ89ABCDEF0123456789',
      name: email.split('@')[0].toUpperCase(),
      email,
      role,
    };
    set({ isAuthenticated: true, user: mockUser });
  },
  logout: () => {
    set({ isAuthenticated: false, user: null });
  },
}));
