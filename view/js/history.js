// history.js — History page logic
axios.defaults.baseURL = SERVER;

let _toast = null;
const getToast = () => {
  if (!_toast) _toast = new Notyf({ position: { x: "center", y: "top" } });
  return _toast;
};

const getToken = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  },
});

// ─── Init ─────────────────────────────────────────────────────────────────────
window.onload = async () => {
  const session = await getSession();
  if (!session) return (location.href = "/login");

  const fullnameEl = document.getElementById("fullname");
  const emailEl = document.getElementById("email");
  if (fullnameEl) fullnameEl.textContent = session.fullname
    ? session.fullname.replace(/\b\w/g, c => c.toUpperCase()) : "";
  if (emailEl) emailEl.textContent = session.email || "";

  fetchHistory();
  fetchProfilePicture();
};

// ─── Skeleton helpers ────────────────────────────────────────────────────────
const historyTableSkeleton = (rows = 4) => Array.from({ length: rows }, () => `
  <tr class="border-t border-zinc-100 dark:border-zinc-800 animate-pulse">
    <td class="px-4 py-4"><div class="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-36"></div></td>
    <td class="px-4 py-4"><div class="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-28"></div></td>
    <td class="px-4 py-4 hidden sm:table-cell"><div class="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-32"></div></td>
  </tr>`).join("");

// ─── Fetch History ────────────────────────────────────────────────────────────
const fetchHistory = async () => {
  const table = document.getElementById("table");
  table.innerHTML = historyTableSkeleton(4); // show skeleton immediately
  try {
    const { data } = await axios.get("/api/share", getToken());
    const items = Array.isArray(data) ? data : (data.data || []);

    table.innerHTML = "";

    if (items.length === 0) {
      table.innerHTML = `
        <tr>
          <td colspan="3" class="px-6 py-14 text-center">
            <div class="flex flex-col items-center gap-2.5">
              <div class="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                <i class="ri-history-line text-zinc-400 text-xl"></i>
              </div>
              <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">No history yet</p>
              <p class="text-sm text-zinc-400 max-w-xs leading-relaxed">
                Activity will appear here once files have been shared.
              </p>
            </div>
          </td>
        </tr>`;
      return;
    }

    for (const item of items) {
      table.innerHTML += `
        <tr class="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-200">
          <td class="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-200 capitalize">
            ${item.file ? item.file.filename : '<span class="text-zinc-400 italic">Deleted file</span>'}
          </td>
          <td class="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400">${item.receiverEmail}</td>
          <td class="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">${moment(item.createdAt).format("DD MMM YYYY, hh:mm A")}</td>
        </tr>`;
    }
  } catch (err) {
    getToast().error(err.response ? err.response.data.message : err.message);
  }
};

// ─── Profile Picture ──────────────────────────────────────────────────────────
const uploadImage = async () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.click();
  input.onchange = async () => {
    try {
      const file = input.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("profilePic", file);
      const { data } = await axios.post("/api/profile-picture", formData, getToken());
      const pic = document.getElementById("profile-image");
      if (data.image) pic.src = data.image;
      getToast().success("Profile picture updated!");
    } catch (err) {
      getToast().error(err.response ? err.response.data.message : err.message);
    }
  };
};

const fetchProfilePicture = async () => {
  try {
    const { status, data } = await axios.get("/api/profile-picture", getToken());
    if (status === 200 && data.image) {
      const pic = document.getElementById("profile-image");
      if (pic) pic.src = data.image;
    }
  } catch {
    // Silently ignore — user just has no profile picture yet
  }
};
