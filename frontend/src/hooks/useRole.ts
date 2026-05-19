import { useAuthStore } from '../store/authStore';

export function useRole() {
  const role = useAuthStore(s => s.role);

  const isAdmin      = role === 'ADMINISTRATEUR';
  const isPharmacien = role === 'PHARMACIEN';

  return { role, isAdmin, isPharmacien };
}