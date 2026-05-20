// files.js — My Files page logic
// NOTE: toast, getSession, logout are defined in session.js / loaded before this file

axios.defaults.baseURL = SERVER;

// Use a function wrapper to avoid 'toast already declared' conflict
// since dashboard.js (loaded on other pages) also declares const toast
let _toast = null;
const getToast = () => {
  if (!_toast) _toast = new Notyf({ position: { x: "center", y: "top" } });
  return _toast;
};

// ─── Init ────────────────────────────────────────────────────────────────────
window.onload = async () => {
  const session = await getSession();
  if (!session) return (location.href = "/login");

  const fullnameEl = document.getElementById("fullname");
  const emailEl = document.getElementById("email");
  // Capitalize: store is lowercase, display with CSS `capitalize` + JS title-case fallback
  if (fullnameEl) fullnameEl.textContent = session.fullname
    ? session.fullname.replace(/\b\w/g, c => c.toUpperCase()) : "";
  if (emailEl) emailEl.textContent = session.email || "";

  fetchFiles();
  fetchProfilePicture();
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Drawer ───────────────────────────────────────────────────────────────────
const toggleDrawer = () => {
  const drawer = document.getElementById("drawer");
  const isOpen = drawer.style.right === "0px";
  drawer.style.right = isOpen ? "-100%" : "0px";
};

// ─── Upload File ──────────────────────────────────────────────────────────────
const uploadFile = async (e) => {
  e.preventDefault();
  const form = e.target;
  const uploadBtn = document.getElementById("uploadBtn");
  const progress = document.getElementById("progress");

  try {
    const formData = new FormData(form);
    const file = formData.get("file");

    if (!file || file.size === 0) {
      return getToast().error("Please choose a file to upload.");
    }
    // 25 MB limit — Render free tier has 512 MB RAM; files pass through memory before Cloudinary
    const MAX_FILE_MB = 25;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      return getToast().error(`File too large — maximum ${MAX_FILE_MB} MB allowed on this plan.`);
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";

    const options = {
      onUploadProgress: (progressEvent) => {
        const pct = Math.floor((progressEvent.loaded * 100) / progressEvent.total);
        progress.style.width = pct + "%";
        progress.textContent = pct + "%";
      },
      ...getToken(),
    };

    const { data } = await axios.post("/api/file", formData, options);
    getToast().success(`"${data.filename}" uploaded successfully!`);
    fetchFiles();
    form.reset();
    progress.style.width = "0";
    progress.textContent = "";
    toggleDrawer();
  } catch (err) {
    getToast().error(err.response ? err.response.data.message : err.message);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload Now";
  }
};

// ─── Skeleton helpers ────────────────────────────────────────────────────────
const fileTableSkeleton = (rows = 5) => Array.from({ length: rows }, () => `
  <tr class="border-t border-zinc-100 dark:border-zinc-800 animate-pulse">
    <td class="px-4 py-4"><div class="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-32"></div></td>
    <td class="px-4 py-4 hidden sm:table-cell"><div class="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-16"></div></td>
    <td class="px-4 py-4 hidden sm:table-cell"><div class="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-12"></div></td>
    <td class="px-4 py-4 hidden md:table-cell"><div class="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-28"></div></td>
    <td class="px-4 py-4"><div class="h-7 bg-zinc-200 dark:bg-zinc-700 rounded-lg w-24"></div></td>
  </tr>`).join("");

// ─── Fetch Files ──────────────────────────────────────────────────────────────
const fetchFiles = async () => {
  const table = document.getElementById("fileTable");
  table.innerHTML = fileTableSkeleton(5); // show skeleton immediately
  try {
    const { data } = await axios.get("/api/file", getToken());
    const files = Array.isArray(data) ? data : (data.data || []);

    table.innerHTML = "";

    if (files.length === 0) {
      table.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-14 text-center text-zinc-400 text-sm">
            No files uploaded yet. Click "Upload File" to get started.
          </td>
        </tr>`;
      return;
    }

    for (const file of files) {
      table.innerHTML += `
        <tr class="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-200">
          <td class="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-200 capitalize">${file.filename}</td>
          <td class="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400 capitalize hidden sm:table-cell">${file.type.split("/")[0]}</td>
          <td class="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">${getSize(file.size)}</td>
          <td class="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400 hidden md:table-cell">${moment(file.createdAt).format("DD MMM YYYY, hh:mm A")}</td>
          <td class="px-4 py-4 text-sm text-zinc-500">
            <div class="flex gap-2">
              <button onclick="deleteFile('${file._id}', this)"
                class="bg-rose-400 px-2 py-1.5 text-white hover:bg-rose-500 active:scale-95 rounded-lg transition">
                <i class="ri-delete-bin-line"></i>
              </button>
              <button onclick="downloadFile('${file._id}', '${file.filename}', this)"
                class="bg-green-400 px-2 py-1.5 text-white rounded-lg hover:bg-green-500 active:scale-95 transition">
                <i class="ri-download-2-line"></i>
              </button>
              <button onclick="openModelForShare('${file._id}', '${file.filename}')"
                class="bg-amber-400 px-2 py-1.5 text-white hover:bg-amber-500 rounded-lg active:scale-95 transition">
                <i class="ri-share-forward-line"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }
  } catch (err) {
    getToast().error(err.response ? err.response.data.message : err.message);
    if (table) table.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-400 text-sm">Failed to load files. Please refresh.</td></tr>`;
  }
};

// ─── Delete File ──────────────────────────────────────────────────────────────
const deleteFile = async (id, button) => {
  try {
    button.innerHTML = `<i class="ri-loader-4-line"></i>`;
    button.disabled = true;
    await axios.delete(`/api/file/${id}`, getToken());
    getToast().success("File deleted successfully!");
    fetchFiles();
  } catch (err) {
    getToast().error(err.response ? err.response.data.message : err.message);
    button.innerHTML = `<i class="ri-delete-bin-line"></i>`;
    button.disabled = false;
  }
};

// ─── Download File ────────────────────────────────────────────────────────────
const downloadFile = async (id, filename, button) => {
  try {
    button.innerHTML = `<i class="ri-loader-4-line"></i>`;
    button.disabled = true;

    const { data } = await axios.get(`/api/file/download/${id}`, {
      responseType: "blob",
      ...getToken(),
    });

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    // Use the filename from the table; extension derived from blob type
    const ext = data.type !== "application/octet-stream" ? data.type.split("/").pop() : "";
    a.download = ext ? `${filename}.${ext}` : filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    getToast().success("Download started!");
  } catch (err) {
    if (err.response && err.response.data) {
      try {
        const text = await err.response.data.text();
        const { message } = JSON.parse(text);
        getToast().error(message);
      } catch {
        getToast().error("Download failed.");
      }
    } else {
      getToast().error(err.message);
    }
  } finally {
    button.innerHTML = `<i class="ri-download-2-line"></i>`;
    button.disabled = false;
  }
};

// ─── Share File (Modal) ───────────────────────────────────────────────────────
const openModelForShare = (id, filename) => {
  Swal.fire({
    showConfirmButton: false,
    allowOutsideClick: true,
    html: `
      <form onsubmit="shareFile('${id}', event)" class="text-left flex flex-col gap-4">
        <h2 class="font-semibold text-zinc-800 text-xl">Share File</h2>
        <p class="text-zinc-500 text-sm">Sharing: <span class="text-violet-600 font-medium">${filename}</span></p>
        <input type="email" name="email" required
          class="border border-gray-300 w-full p-3 rounded-lg text-sm outline-none focus:border-violet-500"
          placeholder="Enter recipient email" />
        <button id="send-button" type="submit"
          class="bg-violet-600 hover:bg-violet-700 text-white rounded-lg py-2.5 px-6 font-medium transition w-full">
          Send
        </button>
      </form>`,
  });
};

const shareFile = async (id, e) => {
  e.preventDefault();
  const sendButton = document.getElementById("send-button");
  const form = e.target;
  try {
    sendButton.disabled = true;
    sendButton.innerHTML = `<i class="ri-loader-4-line"></i> Sending...`;

    const email = form.elements.email.value.trim();
    await axios.post("/api/share", { email, fileId: id }, getToken());
    getToast().success("File shared successfully!");
    Swal.close();
  } catch (err) {
    getToast().error(err.response ? err.response.data.message : err.message);
    sendButton.disabled = false;
    sendButton.textContent = "Send";
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
      // 2 MB limit for profile pictures
      if (file.size > 2 * 1024 * 1024) {
        return getToast().error("Profile picture too large — maximum 2 MB allowed.");
      }
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
