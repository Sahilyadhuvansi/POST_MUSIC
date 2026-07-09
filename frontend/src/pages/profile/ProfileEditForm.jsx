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
    <div
      className="rounded-2xl p-6 sm:p-8 animate-glass-in"
      style={{
        background: "linear-gradient(160deg, rgba(14,14,22,0.75) 0%, rgba(7,7,12,0.85) 100%)",
        backdropFilter: "blur(32px) saturate(160%)",
        WebkitBackdropFilter: "blur(32px) saturate(160%)",
        border: "1px solid rgba(255,255,255,0.09)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      <h2 className="text-lg font-bold text-white mb-6">Edit Profile</h2>
      <form onSubmit={handleUpdate} className="space-y-6">
        <div>
          <label
            htmlFor="p-username"
            className="block text-xs font-semibold mb-2 ml-1"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Username
          </label>
          <input
            id="p-username"
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-300"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
            placeholder="Username"
            autoComplete="username"
          />
        </div>
        <div>
          <label
            htmlFor="p-bio"
            className="block text-xs font-semibold mb-2 ml-1"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Bio
          </label>
          <textarea
            id="p-bio"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Tell the world about yourself..."
            maxLength={160}
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-300 h-24 resize-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          />
          <p className="text-right text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
            {form.bio.length}/160
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl px-6 py-3 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:brightness-110 micro-interact"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.88), rgba(236,72,153,0.82))",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 4px 16px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Saving…
              </span>
            ) : (
              "Save Changes"
            )}
          </button>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="flex-1 rounded-xl px-6 py-3 text-sm font-semibold text-neutral-400 hover:text-white transition-all duration-300 micro-interact"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              backdropFilter: "blur(12px)",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileEditForm;
