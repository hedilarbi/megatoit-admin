import { FirebaseError } from 'firebase/app';

export function getFirebaseErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Adresse email invalide';
      case 'auth/user-disabled':
        return 'Ce compte a été désactivé';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Email ou mot de passe incorrect';
      case 'auth/too-many-requests':
        return 'Trop de tentatives. Veuillez réessayer plus tard';
      case 'auth/invalid-credential':
        return 'Identifiants invalides';
      case 'auth/email-already-in-use':
        return 'Cette adresse email est déjà utilisée';
      case 'auth/weak-password':
        return 'Le mot de passe doit contenir au moins 6 caractères';
      case 'auth/operation-not-allowed':
        return 'Opération non autorisée';
      case 'auth/account-exists-with-different-credential':
        return 'Un compte existe déjà avec ces identifiants';
      default:
        return 'Une erreur est survenue. Veuillez réessayer.';
    }
  }
  return 'Une erreur inattendue est survenue. Veuillez réessayer.';
}
