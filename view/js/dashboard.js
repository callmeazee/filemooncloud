// dashboard.js — Dashboard page logic
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

const getSize = (size) => {
  if (size < 1_000) return `${size} B`;
  if (size < 1_000_000) return `${(size / 1_000).toFixed(1)} KB`;
  if (size < 1_000_000_000) return `${(size / 1_000_000).toFixed(1)} MB`;
  return `${(size / 1_000_000_000).toFixed(2)} GB`;
};

// ─── Init ─────────────────────────────────────────────────────────────────────
window.onload = async () => {
  const session = await getSession();
  if (!session) return (location.href = "/login");

  // Populate sidebar
  const fullnameEl = document.getElementById("fullname");
  const emailEl = document.getElementById("email");
  if (fullnameEl) fullnameEl.textContent = session.fullname
    ? session.fullname.replace(/\b\w/g, c => c.toUpperCase()) : "";
  if (emailEl) emailEl.textContent = session.email || "";

  fetchFilesReport();
  fetchRecentFiles();
  fetchRecentShared();
  fetchProfilePicture();
};

// ─── Skeleton helpers ────────────────────────────────────────────────────────
const cardSkeleton = (count = 3) => Array.from({ length: count }, () => `
  <div class="animate-pulse rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mb-4">
    <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full w-20 mb-3"></div>
    <div class="h-8 bg-zinc-200 dark:bg-zinc-700 rounded-full w-12"></div>
  </div>`).join("");

const listSkeleton = (rows = 4) => Array.from({ length: rows }, () => `
  <div class="animate-pulse flex justify-between items-center py-2 border-b border-zinc-50 dark:border-zinc-800 last:border-0">
    <div class="space-y-2 flex-1 mr-4">
      <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full w-32"></div>
      <div class="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-20"></div>
    </div>
    <div class="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-14 shrink-0"></div>
  </div>`).join("");

// ─── File Type Report Cards ───────────────────────────────────────────────────
const fetchFilesReport = async () => {
  const reportCard = document.getElementById("report-card");
  reportCard.innerHTML = cardSkeleton(3); // skeleton
  try {
    const { data } = await axios.get("/api/dashboard", getToken());
    const items = data.data || [];

    reportCard.innerHTML = "";

    if (items.length === 0) {
      reportCard.innerHTML = `<p class="text-sm text-zinc-400 mb-4">No files uploaded yet.</p>`;
      return;
    }

    const icons = {
      image: "ri-image-fill",
      video: "ri-video-fill",
      audio: "ri-music-fill",
      application: "ri-file-fill",
      text: "ri-file-text-fill",
    };

    for (const item of items) {
      const typeKey = item._id.split("/")[0];
      const icon = icons[typeKey] || "ri-file-line";
      reportCard.innerHTML += `
        <div class="group relative overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 mb-4">
          <div class="absolute -right-4 -top-4 flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
            <i class="${icon} text-2xl text-violet-600"></i>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400 capitalize">${typeKey}s</p>
            <h1 class="text-3xl font-semibold text-zinc-800 dark:text-white">${item.total}</h1>
          </div>
        </div>`;
    }
  } catch (err) {
    getToast().error(err.response ? err.response.data.message : err.message);
  }
};

// ─── Recent Files ─────────────────────────────────────────────────────────────
const fetchRecentFiles = async () => {
  const box = document.getElementById("recent-files-box");
  box.innerHTML = listSkeleton(4); // skeleton
  try {
    const { data } = await axios.get("/api/file?limit=4", getToken());
    const files = Array.isArray(data) ? data : (data.data || []);

    box.innerHTML = "";
    if (files.length === 0) {
      box.innerHTML = `<p class="text-sm text-zinc-400">No files yet.</p>`;
      return;
    }
    for (const item of files) {
      box.innerHTML += `
        <div class="flex justify-between items-start py-2 border-b border-zinc-50 dark:border-zinc-800 last:border-0">
          <div>
            <p class="font-medium text-zinc-700 dark:text-zinc-200 text-sm capitalize">${item.filename}</p>
            <small class="text-zinc-400 text-xs">${getSize(item.size)}</small>
          </div>
          <p class="text-xs text-zinc-400 whitespace-nowrap ml-4">${moment(item.createdAt).format("DD MMM YY")}</p>
        </div>`;
    }
  } catch (err) {
    getToast().error(err.response ? err.response.data.message : err.message);
  }
};

// ─── Recent Shared ────────────────────────────────────────────────────────────
const fetchRecentShared = async () => {
  const box = document.getElementById("recent-shared-box");
  box.innerHTML = listSkeleton(4); // skeleton
  try {
    const { data } = await axios.get("/api/share?limit=4", getToken());
    const items = Array.isArray(data) ? data : (data.data || []);

    box.innerHTML = "";
    if (items.length === 0) {
      box.innerHTML = `<p class="text-sm text-zinc-400">No shares yet.</p>`;
      return;
    }
    for (const item of items) {
      box.innerHTML += `
        <div class="flex justify-between items-start py-2 border-b border-zinc-50 dark:border-zinc-800 last:border-0">
          <div>
            <p class="font-medium text-zinc-700 dark:text-zinc-200 text-sm capitalize">${item.file ? item.file.filename : "Deleted File"}</p>
            <small class="text-zinc-400 text-xs">${item.receiverEmail}</small>
          </div>
          <p class="text-xs text-zinc-400 whitespace-nowrap ml-4">${moment(item.createdAt).format("DD MMM YY")}</p>
        </div>`;
    }
  } catch (err) {
    getToast().error(err.response ? err.response.data.message : err.message);
  }
};

// ─── Profile Picture ──────────────────────────────────────────────────────────
const uploadImage = () => {
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
      await axios.post("/api/profile-picture", formData, getToken());
      const pic = document.getElementById("profile-image");
      pic.src = URL.createObjectURL(file);
    } catch (err) {
      getToast().error(err.response ? err.response.data.message : err.message);
    }
  };
};

const fetchProfilePicture = async () => {
  try {
    const { data } = await axios.get("/api/profile-picture", {
      responseType: "blob",
      ...getToken(),
    });
    const pic = document.getElementById("profile-image");
    pic.src = URL.createObjectURL(data);
  } catch {
    // No profile picture set yet — silently ignore
  }
};
