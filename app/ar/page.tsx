import { LocaleProvider } from '@/context/LocaleContext';
import HomePage from '@/components/HomePage';
import SeoStructuredData from '@/components/SeoStructuredData';

export default function HomeAr() {
  return (
    <>
      <SeoStructuredData locale="ar" />
      <LocaleProvider locale="ar">
        <HomePage />
      </LocaleProvider>
    </>
  );
}
