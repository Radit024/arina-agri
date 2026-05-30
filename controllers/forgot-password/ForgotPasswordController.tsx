'use client';

import ForgotPasswordView from '@/app/forgot-password/_components/ForgotPasswordView';
import { useForgotPasswordController } from './useForgotPasswordController';

export default function ForgotPasswordController() {
  const controller = useForgotPasswordController();

  return <ForgotPasswordView {...controller} />;
}
