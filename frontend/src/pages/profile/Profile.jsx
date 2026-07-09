import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useMusic } from "../../features/music/MusicContext";
import { useProfileController } from "./useProfileController";
import ProfileUniverseSection from "./ProfileUniverseSection";
import ProfileHeaderSection from "./ProfileHeaderSection";
import ProfileEditForm from "./ProfileEditForm";
import { ProfileSkeleton } from "../../components/SkeletonLoader";

const Profile = () => {
  const { user, logout, updateUser, loading: authLoading } = useAuth();
  const { playTrack, currentTrack, isPlaying } = useMusic();
  const navigate = useNavigate();
  const {
    form,
    setForm,
    preview,
    loading,
    error,
    success,
    isEditing,
    setIsEditing,
    universe,
    loadingUniverse,
    fileInputRef,
    handleDeleteTrack,
    handleFileChange,
    handleUpdate,
    handleCancelEdit,
  } = useProfileController({ user, updateUser });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (authLoading) return <ProfileSkeleton />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div
        className="h-40 sm:h-52 w-full relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.35), rgba(168,85,247,0.25), rgba(236,72,153,0.3))",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06), transparent 50%)" }} />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,transparent_40%)]" />
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-16">
        <ProfileHeaderSection
          user={user}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          fileInputRef={fileInputRef}
          preview={preview}
          handleFileChange={handleFileChange}
          handleLogout={handleLogout}
        />

        {success && (
          <div
            className="mb-6 p-4 rounded-2xl text-emerald-300 text-sm font-medium"
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.22)",
              backdropFilter: "blur(12px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {success}
          </div>
        )}
        {error && (
          <div
            className="mb-6 p-4 rounded-2xl text-red-300 text-sm font-medium"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.22)",
              backdropFilter: "blur(12px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {error}
          </div>
        )}

        <ProfileEditForm
          isEditing={isEditing}
          form={form}
          setForm={setForm}
          loading={loading}
          handleUpdate={handleUpdate}
          handleCancelEdit={handleCancelEdit}
        />

        <ProfileUniverseSection
          isEditing={isEditing}
          universe={universe}
          loadingUniverse={loadingUniverse}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          playTrack={playTrack}
          handleDeleteTrack={handleDeleteTrack}
        />
      </div>
    </div>
  );
};

export default Profile;
