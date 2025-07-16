import { User } from 'firebase/auth';

type UserType = 'patient' | 'doctor' | 'admin';

interface AppUser {
  uid: string;
  email: string;
  type: UserType;
  name?: string;
  createdAt?: Date;
}

declare module 'next' {
  interface NextPageContext {
    currentUser?: User | null;
    userData?: AppUser | null;
  }
}
