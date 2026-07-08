import { DEFAULT_AVATAR } from "../../config";

const ProfileHeaderSection = ({
  user,
  isEditing,
  setIsEditing,
  fileInputRef,
  preview,
  handleFileChange,
  handleLogout,
}) => {
  return (
    <div className="relative -mt-16 sm:-mt-20 mb-8">
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
        <div
          onClick={() => isEditing && fileInputRef.current?.click()}
          className={`relative h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 p-[3px] shadow-xl ${isEditing ? "cursor-pointer" : ""}`}
        >
          <div className="h-full w-full rounded-full overflow-hidden bg-neutral-900 ring-4 ring-black">
            <img
              src={preview || DEFAULT_AVATAR}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = DEFAULT_AVATAR;
              }}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          </div>
          {isEditing && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />

        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {user.username}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Member since{" "}
            {user.createdAt
              ? new Date(user.createdAt).getUTCFullYear()
              : "2026"}
          </p>
          {user.bio && (
            <p className="text-sm text-neutral-400 mt-2 max-w-md">{user.bio}</p>
          )}
        </div>

        <div className="flex gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/10 px-5 py-2.5 text-sm font-semibold text-neutral-300 hover:text-white transition-all"
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500 px-5 py-2.5 text-sm font-semibold text-red-400 hover:text-white transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeaderSection;
