'use client';
import dynamic from 'next/dynamic';

/* Tắt SSR toàn bộ app (kể cả AppProvider):
   - Internal tool, không cần SEO
   - Tránh hydration mismatch do browser extension (bis_skin_checked)
*/
const App = dynamic(
  () =>
    import('@/context/AppContext').then(({ AppProvider }) =>
      import('@/components/MainLayout/MainLayout').then(({ default: MainLayout }) => {
        function App() {
          return (
            <AppProvider>
              <MainLayout />
            </AppProvider>
          );
        }
        return App;
      })
    ),
  { ssr: false }
);

export default function Home() {
  return <App />;
}
