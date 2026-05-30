import { Suspense } from 'react';
import AuthCallbackController from '@/controllers/auth-callback/AuthCallbackController';
import AuthCallbackView from './_components/AuthCallbackView';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackView message="Memproses login Google..." />}>
      <AuthCallbackController />
    </Suspense>
  );
}
