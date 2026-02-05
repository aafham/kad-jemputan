document.getElementById("btn").onclick = () => {
  document.body.classList.add("open");
};
const btn = document.getElementById("btn");

btn.onclick = () => {
  document.body.classList.add("open");
  btn.style.opacity = "0";
  btn.style.pointerEvents = "none";
};
