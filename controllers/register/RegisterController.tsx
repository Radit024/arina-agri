'use client';

import RegisterView from '@/app/register/_components/RegisterView';
import { useRegisterController } from './useRegisterController';

export default function RegisterController() {
  const controller = useRegisterController();

  return <RegisterView {...controller} />;
}
