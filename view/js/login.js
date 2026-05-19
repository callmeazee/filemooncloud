// login.js
axios.defaults.baseURL = SERVER;

let _toast = null;
const getToast = () => {
  if (!_toast) _toast = new Notyf({ position: { x: "center", y: "top" } });
  return _toast;
};

// Redirect to dashboard if already logged in
(async () => {
  const session = await getSession();
  if (session) location.href = "/dashboard";
})();

const login = async (e) => {
  try {
    e.preventDefault();
    const form = e.target;
    const payload = {
      email: form.elements.email.value,
      password: form.elements.password.value,
    };
    const { data } = await axios.post("/api/login", payload);
    localStorage.setItem("authToken", data.token);
    axios.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    getToast().success(data.message);
    setTimeout(() => { location.href = "/dashboard"; }, 1500);
  } catch (err) {
    getToast().error(err.response ? err.response.data.message : err.message);
  }
};
