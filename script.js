const btn = document.getElementById("btn");

btn.onclick = () => {
  document.body.classList.add("opened");
  btn.style.opacity = "0";
  btn.style.pointerEvents = "none";
};
