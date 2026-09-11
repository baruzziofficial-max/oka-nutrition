import { LocaleProvider } from '@/context/LocaleContext';
import HomePage from '@/components/HomePage';
import SeoStructuredData from '@/components/SeoStructuredData';

export default function Home() {
  return (
    <>
      <SeoStructuredData locale="fr" />
      <LocaleProvider locale="fr">
        <HomePage />
      </LocaleProvider>
    </>
  );
}
