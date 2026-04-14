'use client';

import GlobalError from '@/app/error';

interface ConfigErrorFallbackProps {
  readonly message: string;
}

export default function ConfigErrorFallback({ message }: Readonly<ConfigErrorFallbackProps>) {
  return <GlobalError error={new Error(message)} reset={() => {}} />;
}
