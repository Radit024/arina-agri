'use client';

import LoginView from '@/app/login/_components/LoginView';
import { useLoginController } from './useLoginController';

export default function LoginController() {
  const controller = useLoginController();

  return <LoginView {...controller} />;
}
