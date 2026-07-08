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

// Components
import Header from "./components/Header";
import Footer from "./components/Footer";
import Player from "./features/music/Player";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import FloatingAIButton from "./components/FloatingAIButton";

const AppRouter = () => {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
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
