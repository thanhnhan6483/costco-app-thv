'use client';
import { Component, ReactNode } from 'react';
import dynamic from 'next/dynamic';

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

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, color: '#b91c1c', background: '#fef2f2', borderRadius: 8, margin: 16, fontFamily: 'sans-serif' }}>
        <strong>Lỗi ứng dụng:</strong> {this.state.error}
        <br /><button style={{ marginTop: 12, padding: '6px 16px', cursor: 'pointer' }} onClick={() => this.setState({ error: null })}>🔄 Thử lại</button>
      </div>
    );
    return this.props.children;
  }
}

export default function Home() {
  return <RootErrorBoundary><App /></RootErrorBoundary>;
}
