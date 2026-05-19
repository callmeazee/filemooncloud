// signup.js
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

const signup = async (e) => {
  try {
    e.preventDefault();
    const form = e.target;
    const payload = {
      fullname: form.elements.fullname.value,
      mobile: form.elements.mobile.value,
      email: form.elements.email.value,
      password: form.elements.password.value,
    };
    const { data } = await axios.post("/api/signup", payload);
    form.reset();
    getToast().success(data.message);
    setTimeout(() => { location.href = "/login"; }, 2000);
  } catch (err) {
    getToast().error(err.response ? err.response.data.message : err.message);
  }
};
