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
      <div className="h-40 sm:h-52 w-full bg-gradient-to-br from-indigo-600/40 via-purple-600/30 to-pink-600/40" />

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
          <div className="mb-6 p-3.5 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 text-sm font-medium">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-medium">
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
