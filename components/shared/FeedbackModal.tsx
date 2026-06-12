'use client';

import FeedbackModalView from '@/components/shared/FeedbackModalView';
import {
  type FeedbackModalProps,
  useFeedbackModalController,
} from '@/controllers/feedback/useFeedbackModalController';

export default function FeedbackModal(props: FeedbackModalProps) {
  const controller = useFeedbackModalController(props);

  return <FeedbackModalView {...controller} />;
}
