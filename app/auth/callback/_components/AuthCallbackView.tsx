interface AuthCallbackViewProps {
  message: string;
}

export default function AuthCallbackView({ message }: AuthCallbackViewProps) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <p>{message}</p>
    </main>
  );
}
