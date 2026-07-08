const ProfileEditForm = ({
  isEditing,
  form,
  setForm,
  loading,
  handleUpdate,
  handleCancelEdit,
}) => {
  if (!isEditing) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-950/80 backdrop-blur-xl p-6 sm:p-8">
      <h2 className="text-lg font-bold text-white mb-6">Edit Profile</h2>
      <form onSubmit={handleUpdate} className="space-y-6">
        <div>
          <label
            htmlFor="p-username"
            className="block text-xs font-semibold text-neutral-400 mb-2 ml-1"
          >
            Username
          </label>
          <input
            id="p-username"
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Username"
            autoComplete="username"
          />
        </div>
        <div>
          <label
            htmlFor="p-bio"
            className="block text-xs font-semibold text-neutral-400 mb-2 ml-1"
          >
            Bio
          </label>
          <textarea
            id="p-bio"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Tell the world about yourself..."
            maxLength={160}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 h-24 resize-none"
          />
          <p className="text-right text-xs text-neutral-600 mt-1">
            {form.bio.length}/160
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </button>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-6 py-3 text-sm font-semibold text-neutral-400 hover:text-white transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileEditForm;
