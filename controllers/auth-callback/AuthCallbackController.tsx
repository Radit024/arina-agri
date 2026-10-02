'use client';

import AuthCallbackView from '@/app/auth/callback/_components/AuthCallbackView';
import { useAuthCallbackController } from './useAuthCallbackController';

export default function AuthCallbackController() {
  const controller = useAuthCallbackController();

  return <AuthCallbackView {...controller} />;
}
