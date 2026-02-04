import AppShell from '../components/AppShell';

interface PageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function Page({ searchParams }: PageProps) {
  const patientId = typeof searchParams?.patientId === 'string' ? searchParams.patientId : undefined;
  return <AppShell initialPatientId={patientId} />;
}
