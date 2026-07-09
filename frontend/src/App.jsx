import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { MusicProvider } from "./features/music/MusicContext";

// Lazy-loaded page components
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const Music = lazy(() => import("./pages/music/Music"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Components
import Header from "./components/Header";
import Footer from "./components/Footer";
import Player from "./features/music/Player";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import FloatingAIButton from "./components/FloatingAIButton";
import { useAuth } from "./features/auth/AuthContext";

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="flex flex-col items-center gap-5">
      <div
        className="relative h-14 w-14 rounded-full flex items-center justify-center"
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full"
          style={{
            border: "2px solid rgba(255,255,255,0.06)",
            borderTopColor: "#818cf8",
          }}
        />
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08), transparent)" }} />
      </div>
      <p
        className="text-[10px] font-black uppercase tracking-[0.35em]"
        style={{ color: "rgba(255,255,255,0.2)" }}
      >
        Loading
      </p>
    </div>
  </div>
);

const AppRouter = () => {
  const { loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Music />} />
        <Route path="/music" element={<Music />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MusicProvider>
          <Router>
            <Header />
            <main className="min-h-[80vh] selection:bg-indigo-500/30">
              <AppRouter />
            </main>
            <Footer />
            <Player />
            <FloatingAIButton />
          </Router>
        </MusicProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
