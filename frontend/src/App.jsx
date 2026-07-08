import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { MusicProvider } from "./features/music/MusicContext";

// Lazy-loaded page components
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const Music = lazy(() => import("./pages/music/Music"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
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
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-600">Loading</p>
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
        <Route path="/ai-picks" element={<Recommendations />} />
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
